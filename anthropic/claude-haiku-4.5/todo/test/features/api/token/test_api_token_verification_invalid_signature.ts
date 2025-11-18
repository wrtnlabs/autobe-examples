import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification with an invalid or tampered signature.
 *
 * This test validates that the token verification endpoint properly detects and
 * rejects tokens that have been tampered with. JWT tokens consist of three
 * parts separated by dots: header, payload, and signature. This test modifies
 * the signature portion (the last part after the final dot) to simulate a token
 * tampering attack.
 *
 * The test flow:
 *
 * 1. Create a user account to obtain a valid JWT token
 * 2. Extract the valid token from the authentication response
 * 3. Tamper with the token by modifying characters in the signature portion
 * 4. Attempt to verify the tampered token using the verify-token endpoint
 * 5. Validate that the response indicates is_valid: false with an appropriate
 *    failure_reason mentioning signature invalidity
 *
 * This ensures the backend properly validates JWT signatures and prevents the
 * use of forged or modified tokens.
 */
export async function test_api_token_verification_invalid_signature(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to obtain a valid token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const password = "ValidPassword123";

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });

  typia.assert(registrationResponse);

  // Step 2: Extract the valid access token
  const validToken: string = registrationResponse.token.access;

  // Verify token format: JWT tokens have three parts separated by dots
  const tokenParts: string[] = validToken.split(".");
  TestValidator.predicate(
    "valid token should have three parts",
    tokenParts.length === 3,
  );

  // Step 3: Tamper with the signature portion (last part)
  const header: string = tokenParts[0];
  const payload: string = tokenParts[1];
  const signature: string = tokenParts[2];

  // Modify characters in the signature to invalidate it
  const tamperedSignatureChars: string[] = signature.split("");

  // Replace the first few characters of the signature with different characters
  for (let i = 0; i < Math.min(3, tamperedSignatureChars.length); i++) {
    const currentChar = tamperedSignatureChars[i];
    // Find a different character to replace with
    tamperedSignatureChars[i] = currentChar === "a" ? "b" : "a";
  }

  const tamperedSignature: string = tamperedSignatureChars.join("");
  const tamperedToken: string = `${header}.${payload}.${tamperedSignature}`;

  // Verify that the tampered token is different from the original
  TestValidator.notEquals(
    "tampered token should differ from original",
    tamperedToken,
    validToken,
  );

  // Step 4: Set the tampered token in the Authorization header
  const tamperedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${tamperedToken}`,
    },
  };

  // Step 5: Attempt to verify the tampered token
  const verificationResult: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      tamperedConnection,
    );

  typia.assert(verificationResult);

  // Step 6: Validate that the token is marked as invalid
  TestValidator.predicate(
    "tampered token should be marked as invalid",
    verificationResult.is_valid === false,
  );

  // Step 7: Verify failure reason indicates signature issue
  TestValidator.predicate(
    "failure reason should indicate signature invalidity",
    verificationResult.failure_reason !== null &&
      verificationResult.failure_reason.toLowerCase().includes("signature"),
  );
}
