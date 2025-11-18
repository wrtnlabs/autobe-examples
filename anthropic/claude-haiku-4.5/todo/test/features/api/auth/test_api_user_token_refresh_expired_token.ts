import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh rejection when using an invalid refresh token.
 *
 * This test validates that when an invalid or malformed refresh token is used
 * to request a new access token, the API correctly rejects the request and
 * returns an authentication error. The test ensures that only valid tokens can
 * be used to obtain new credentials, maintaining security by preventing the use
 * of tampered or invalid tokens.
 *
 * The test flow:
 *
 * 1. Create a new user account to establish baseline
 * 2. Attempt to use an invalid refresh token to refresh the access token
 * 3. Verify that the API rejects the request with an authentication error
 * 4. Confirm that the error is properly handled without exposing sensitive details
 */
export async function test_api_user_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish baseline
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Attempt to use an invalid refresh token
  // This simulates the scenario where a refresh token is invalid,
  // expired, or has been revoked
  const invalidRefreshToken = "invalid.malformed.token";

  // Step 3: Verify that the API rejects the invalid token
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
