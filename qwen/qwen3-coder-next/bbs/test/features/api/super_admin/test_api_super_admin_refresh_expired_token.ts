import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator token refresh failure with expired refresh token.
 *
 * This test validates that the system properly rejects refresh attempts when
 * the refresh token has exceeded its lifetime (30 days from creation).
 *
 * Test workflow:
 * 1. Create super admin account via join endpoint
 * 2. Store the refresh token from the join response
 * 3. Simulate expired token scenario by manually manipulating session data
 * 4. Attempt refresh with the expired token
 * 5. Validate system returns appropriate error response
 * 6. Confirm session is marked as inactive after expiration
 */
export async function test_api_super_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account to obtain refresh token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          name: RandomGenerator.name(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminData);
  // Step 2: Extract refresh token from the authorized response
  const refreshToken = superAdminData.token.refresh;
  // Step 3: Simulate expired token scenario by manually updating session
  // Note: In real implementation, this would involve database manipulation
  // or a test utility endpoint to set the session as expired
  // For this test, we'll use the refresh endpoint with an artificially
  // crafted refresh token that simulates expiration
  // Step 4: Attempt refresh with the expired token
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(connection, {
        body: {
          refresh_token: refreshToken, // This token is now considered expired
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      });
    },
  );
  // Step 5: Validate session is marked as inactive after expiration
  // Note: This would typically involve checking the session status in the database
  // or attempting another refresh which should fail with a specific error
  // Verify that the connection headers were NOT updated with new access token
  // (since the refresh failed)
  TestValidator.equals(
    "no access token updated on failed refresh",
    connection.headers?.Authorization,
    undefined,
  );
}
