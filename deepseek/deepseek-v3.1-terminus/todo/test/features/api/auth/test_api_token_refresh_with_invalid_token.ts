import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMinimalTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoUser";

/**
 * Test the refresh endpoint with invalid or expired refresh tokens.
 *
 * This test validates that the authentication system properly rejects invalid
 * refresh tokens and prevents unauthorized token refresh operations. The test
 * creates a user account to obtain valid tokens, then intentionally uses
 * invalid tokens that are syntactically valid but semantically incorrect to
 * ensure the system returns appropriate error responses when token validation
 * fails.
 */
export async function test_api_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Create a user account to obtain valid authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123" satisfies string;

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IMinimalTodoUser.ICreate,
  });
  typia.assert(user);

  // 2. Test token refresh with a completely invalid token string (syntactically valid but semantically invalid)
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid_token_string_that_is_type_safe_but_semantically_invalid",
      } satisfies IMinimalTodoUser.IRefresh,
    });
  });

  // 3. Test token refresh with an expired token (proper JWT format but expired)
  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired_signature_test",
      } satisfies IMinimalTodoUser.IRefresh,
    });
  });

  // 4. Test token refresh with a token that has incorrect signature format
  await TestValidator.error(
    "token with incorrect signature should be rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.incorrect_signature_format_invalid",
        } satisfies IMinimalTodoUser.IRefresh,
      });
    },
  );

  // 5. Test token refresh with a randomly generated JWT-like string
  await TestValidator.error(
    "random JWT-like string should be rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ iat: Date.now(), exp: Date.now() - 1000 }))}.${RandomGenerator.alphaNumeric(43)}`,
        } satisfies IMinimalTodoUser.IRefresh,
      });
    },
  );

  // 6. Test token refresh with a token that has missing required claims
  await TestValidator.error(
    "token with missing required claims should be rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTU5NzI4MDB9.missing_required_claims_signature",
        } satisfies IMinimalTodoUser.IRefresh,
      });
    },
  );
}
