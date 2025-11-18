import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token verification with malformed JWT tokens.
 *
 * This test validates that the token verification endpoint properly detects and
 * rejects malformed tokens. The test verifies the endpoint's ability to
 * distinguish between valid and invalid token structures, ensuring proper
 * validation of JWT format and integrity.
 *
 * **Setup:**
 *
 * 1. Register a new user to establish valid authentication context
 * 2. Extract valid token for baseline verification
 *
 * **Test Scenarios:**
 *
 * 1. Verify that a valid token returns is_valid: true
 * 2. Attempt to verify with a malformed token (invalid JWT structure)
 * 3. Confirm that malformed tokens result in is_valid: false
 * 4. Verify appropriate failure_reason is provided for invalid tokens
 * 5. Validate response structure contains all required fields
 */
export async function test_api_token_verification_malformed_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish valid authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registered);

  // Step 2: Verify that valid token works correctly
  const validTokenResult: ITodoListUser.ITokenVerification =
    await api.functional.todoList.user.auth.user.verify_token.verifyToken(
      connection,
    );
  typia.assert(validTokenResult);
  TestValidator.predicate(
    "valid token should return is_valid: true",
    validTokenResult.is_valid === true,
  );
  TestValidator.equals(
    "valid token should have null failure_reason",
    validTokenResult.failure_reason,
    null,
  );

  // Step 3: Test with malformed token - random characters without JWT structure
  const malformedToken1 = RandomGenerator.alphaNumeric(50);
  const connectionWithMalformed1 = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${malformedToken1}`,
    },
  };

  await TestValidator.error(
    "malformed token without JWT structure should fail or return is_valid: false",
    async () => {
      const result =
        await api.functional.todoList.user.auth.user.verify_token.verifyToken(
          connectionWithMalformed1,
        );
      // If request succeeds, verify the response indicates invalid token
      typia.assert(result);
      if (result.is_valid === true) {
        throw new Error("Malformed token should not be marked as valid");
      }
      TestValidator.predicate(
        "malformed token should have failure reason",
        result.failure_reason !== null,
      );
    },
  );

  // Step 4: Test with malformed token - too many segments
  const malformedToken2 = "header.payload.signature.extra.segments";
  const connectionWithMalformed2 = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${malformedToken2}`,
    },
  };

  await TestValidator.error(
    "malformed token with too many segments should fail or return is_valid: false",
    async () => {
      const result =
        await api.functional.todoList.user.auth.user.verify_token.verifyToken(
          connectionWithMalformed2,
        );
      typia.assert(result);
      if (result.is_valid === true) {
        throw new Error("Token with too many segments should not be valid");
      }
      TestValidator.predicate(
        "invalid token structure should have failure reason",
        result.failure_reason !== null,
      );
    },
  );

  // Step 5: Test with malformed token - incomplete JWT (missing signature)
  const malformedToken3 =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";
  const connectionWithMalformed3 = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${malformedToken3}`,
    },
  };

  await TestValidator.error(
    "incomplete JWT token should fail or return is_valid: false",
    async () => {
      const result =
        await api.functional.todoList.user.auth.user.verify_token.verifyToken(
          connectionWithMalformed3,
        );
      typia.assert(result);
      if (result.is_valid === true) {
        throw new Error("Incomplete JWT should not be valid");
      }
      TestValidator.predicate(
        "incomplete JWT should have failure reason",
        result.failure_reason !== null,
      );
    },
  );

  // Step 6: Test with malformed token - special characters
  const malformedToken4 = "header@payload#signature!invalid";
  const connectionWithMalformed4 = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${malformedToken4}`,
    },
  };

  await TestValidator.error(
    "malformed token with special characters should fail or return is_valid: false",
    async () => {
      const result =
        await api.functional.todoList.user.auth.user.verify_token.verifyToken(
          connectionWithMalformed4,
        );
      typia.assert(result);
      if (result.is_valid === true) {
        throw new Error("Token with invalid characters should not be valid");
      }
      TestValidator.predicate(
        "token with special characters should have failure reason",
        result.failure_reason !== null,
      );
    },
  );
}
