import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test token refresh rejection with invalid or expired refresh tokens.
 *
 * This test validates the security of the token refresh mechanism by ensuring
 * that only legitimate refresh tokens can obtain new access tokens. The test
 * creates an admin account, performs login to get valid tokens, then attempts
 * to refresh using various invalid refresh token scenarios including random
 * strings, malformed tokens, and empty tokens.
 *
 * The test verifies that:
 *
 * 1. Admin account can be created successfully
 * 2. Admin can login and receive valid tokens
 * 3. Invalid refresh tokens are properly rejected
 * 4. Malformed refresh tokens are rejected
 * 5. Empty refresh tokens are rejected
 *
 * Each invalid refresh attempt should throw an error without issuing new
 * tokens.
 */
export async function test_api_admin_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const createBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(createdAdmin);

  // Step 2: Login to get valid tokens
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ILogin;

  const loggedInAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Test with random invalid refresh token (random alphanumeric string)
  const randomInvalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "random invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: randomInvalidToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // Step 4: Test with malformed refresh token (very short string)
  const malformedToken = RandomGenerator.alphaNumeric(5);

  await TestValidator.error(
    "malformed refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: malformedToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // Step 5: Test with empty string token
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: "",
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );

  // Step 6: Test with completely different format (special characters)
  const specialCharToken = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";

  await TestValidator.error(
    "special character refresh token should be rejected",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: specialCharToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}
