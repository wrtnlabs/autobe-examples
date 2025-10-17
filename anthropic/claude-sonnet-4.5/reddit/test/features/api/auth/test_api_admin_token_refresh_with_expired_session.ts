import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test administrator token refresh with an expired or invalid session.
 *
 * This test validates that the system properly rejects token refresh attempts
 * when the session is expired or invalid. It creates a new admin account to
 * establish baseline authentication, then attempts to refresh using an invalid
 * refresh token that simulates an expired session scenario.
 *
 * Steps:
 *
 * 1. Create a new admin account via the join endpoint
 * 2. Verify the initial authentication tokens are received
 * 3. Attempt to refresh with an invalid/non-existent refresh token
 * 4. Validate that the refresh request is rejected with an error
 * 5. Confirm the error indicates session expiration requiring full re-login
 */
export async function test_api_admin_token_refresh_with_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to establish baseline
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });

  // Step 2: Verify the admin was created successfully
  typia.assert(admin);
  TestValidator.equals(
    "admin username matches",
    admin.username,
    adminData.username,
  );
  TestValidator.equals("admin email matches", admin.email, adminData.email);

  // Step 3: Attempt to refresh with an invalid refresh token
  // Use a token that doesn't exist in redis_like_sessions to simulate expired session
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Validate that the refresh request is rejected
  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IRedditLikeAdmin.IRefresh,
      });
    },
  );
}
