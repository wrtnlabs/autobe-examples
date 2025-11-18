import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh behavior with invalid refresh tokens.
 *
 * This test validates that the refresh endpoint properly rejects invalid or
 * non-existent refresh tokens. Since the available API endpoints do not include
 * session management or login functionality (only join and refresh), we cannot
 * test actual session revocation. Instead, this test verifies that attempting
 * to refresh with an invalid token fails with an appropriate error.
 *
 * This ensures the refresh endpoint validates tokens against the database and
 * prevents unauthorized token generation.
 *
 * Steps:
 *
 * 1. Create a new user account via the join endpoint
 * 2. Verify the initial tokens work correctly
 * 3. Attempt to refresh using an invalid/fake refresh token
 * 4. Verify that the refresh attempt fails with an error
 */
export async function test_api_user_token_refresh_with_revoked_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and establish initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Verify the user was created successfully
  TestValidator.equals("user email matches", joinResponse.email, userEmail);

  // Step 3 & 4: Attempt to refresh using an invalid refresh token
  // This simulates attempting to use a revoked or non-existent token
  const invalidRefreshToken = RandomGenerator.alphaNumeric(64);

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
