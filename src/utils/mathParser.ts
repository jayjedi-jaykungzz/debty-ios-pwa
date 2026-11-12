export type MathParserStatus = 'valid' | 'incomplete' | 'invalid';

export interface MathParserResult {
  status: MathParserStatus;
  cents: number;
  value: number;
  hasOperators: boolean;
  raw: string;
  formatted: string;
  errorMessage?: string;
}

type TokenType = 'NUMBER' | 'PLUS' | 'MINUS' | 'MULTIPLY' | 'DIVIDE' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

/**
 * Pure Recursive-Descent PEMDAS Math Expression Evaluator
 * Safely parses financial and arithmetic expressions like "150+45", "1200/3", "500-120*2", "(100+50)*1.07"
 * NEVER uses eval() or Function().
 */
export function evaluateMathExpression(input: string): MathParserResult {
  const raw = input.trim();

  if (!raw) {
    return {
      status: 'incomplete',
      cents: 0,
      value: 0,
      hasOperators: false,
      raw: '',
      formatted: '',
      errorMessage: 'Enter an amount',
    };
  }

  // Normalize operators: replace unicode minus, times, divide symbols, and strip thousand commas
  const sanitized = raw
    .replace(/,/g, '')
    .replace(/[×xX]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-');

  // Check for trailing incomplete states such as ending with an operator or trailing decimal point
  const isTrailingIncomplete = /[+\-*/.]$/.test(sanitized.trim());

  // Tokenize
  const tokens: Token[] = [];
  let i = 0;
  let hasOperators = false;
  let openParensCount = 0;

  while (i < sanitized.length) {
    const char = sanitized[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (char === '+') {
      tokens.push({ type: 'PLUS', value: '+', pos: i });
      hasOperators = true;
      i++;
    } else if (char === '-') {
      tokens.push({ type: 'MINUS', value: '-', pos: i });
      hasOperators = true;
      i++;
    } else if (char === '*') {
      tokens.push({ type: 'MULTIPLY', value: '*', pos: i });
      hasOperators = true;
      i++;
    } else if (char === '/') {
      tokens.push({ type: 'DIVIDE', value: '/', pos: i });
      hasOperators = true;
      i++;
    } else if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      openParensCount++;
      i++;
    } else if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      openParensCount--;
      if (openParensCount < 0) {
        return {
          status: 'invalid',
          cents: 0,
          value: 0,
          hasOperators: true,
          raw,
          formatted: raw,
          errorMessage: 'Unmatched closing parenthesis',
        };
      }
      i++;
    } else if (/[0-9.]/.test(char)) {
      let numStr = '';
      let decimalCount = 0;
      const startPos = i;

      while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
        if (sanitized[i] === '.') {
          decimalCount++;
          if (decimalCount > 1) {
            return {
              status: 'invalid',
              cents: 0,
              value: 0,
              hasOperators,
              raw,
              formatted: raw,
              errorMessage: 'Multiple decimal points in number',
            };
          }
        }
        numStr += sanitized[i];
        i++;
      }

      tokens.push({ type: 'NUMBER', value: numStr, pos: startPos });
    } else {
      // Unrecognized character
      return {
        status: 'invalid',
        cents: 0,
        value: 0,
        hasOperators,
        raw,
        formatted: raw,
        errorMessage: `Unexpected character "${char}"`,
      };
    }
  }

  // If parens are still open, or ends with operator/decimal, it's incomplete
  if (openParensCount > 0 || isTrailingIncomplete) {
    return {
      status: 'incomplete',
      cents: 0,
      value: 0,
      hasOperators,
      raw,
      formatted: raw,
      errorMessage: openParensCount > 0 ? 'Incomplete: unclosed parenthesis' : 'Incomplete expression',
    };
  }

  if (tokens.length === 0) {
    return {
      status: 'incomplete',
      cents: 0,
      value: 0,
      hasOperators: false,
      raw,
      formatted: '',
      errorMessage: 'Enter an amount',
    };
  }

  // Recursive Descent Parser
  let current = 0;

  function peek(): Token | undefined {
    return tokens[current];
  }

  function consume(expectedType?: TokenType): Token {
    const token = tokens[current];
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Expected ${expectedType} but found ${token.type}`);
    }
    current++;
    return token;
  }

  // Expression = Term ( ( '+' | '-' ) Term )*
  function parseExpression(): number {
    let result = parseTerm();

    while (current < tokens.length) {
      const token = peek();
      if (token && (token.type === 'PLUS' || token.type === 'MINUS')) {
        consume();
        const nextTerm = parseTerm();
        if (token.type === 'PLUS') {
          result += nextTerm;
        } else {
          result -= nextTerm;
        }
      } else {
        break;
      }
    }

    return result;
  }

  // Term = Factor ( ( '*' | '/' ) Factor )*
  function parseTerm(): number {
    let result = parseFactor();

    while (current < tokens.length) {
      const token = peek();
      if (token && (token.type === 'MULTIPLY' || token.type === 'DIVIDE')) {
        consume();
        const nextFactor = parseFactor();
        if (token.type === 'MULTIPLY') {
          result *= nextFactor;
        } else {
          if (Math.abs(nextFactor) < 0.0000000001) {
            throw new Error('Division by zero');
          }
          result /= nextFactor;
        }
      } else {
        break;
      }
    }

    return result;
  }

  // Factor = ( '+' | '-' ) Factor | '(' Expression ')' | NUMBER
  function parseFactor(): number {
    const token = peek();
    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'PLUS') {
      consume('PLUS');
      return parseFactor();
    }

    if (token.type === 'MINUS') {
      consume('MINUS');
      return -parseFactor();
    }

    if (token.type === 'LPAREN') {
      consume('LPAREN');
      const val = parseExpression();
      consume('RPAREN');
      return val;
    }

    if (token.type === 'NUMBER') {
      consume('NUMBER');
      const val = parseFloat(token.value);
      if (Number.isNaN(val)) {
        throw new Error('Invalid number format');
      }
      return val;
    }

    throw new Error(`Unexpected token "${token.value}"`);
  }

  try {
    const calculatedValue = parseExpression();

    if (current < tokens.length) {
      return {
        status: 'invalid',
        cents: 0,
        value: 0,
        hasOperators,
        raw,
        formatted: raw,
        errorMessage: 'Malformed expression syntax',
      };
    }

    if (!Number.isFinite(calculatedValue)) {
      return {
        status: 'invalid',
        cents: 0,
        value: 0,
        hasOperators,
        raw,
        formatted: raw,
        errorMessage: 'Calculation produced an infinite value',
      };
    }

    if (calculatedValue <= 0) {
      return {
        status: 'invalid',
        cents: 0,
        value: calculatedValue,
        hasOperators,
        raw,
        formatted: raw,
        errorMessage: 'Total amount must be greater than zero',
      };
    }

    const cents = Math.round(calculatedValue * 100);

    return {
      status: 'valid',
      cents,
      value: calculatedValue,
      hasOperators,
      raw,
      formatted: calculatedValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid math expression';
    return {
      status: 'invalid',
      cents: 0,
      value: 0,
      hasOperators,
      raw,
      formatted: raw,
      errorMessage: message,
    };
  }
}
