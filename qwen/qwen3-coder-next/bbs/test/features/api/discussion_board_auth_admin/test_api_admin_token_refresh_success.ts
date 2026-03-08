import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new admin user
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  // Step 2: Login as the admin to obtain initial tokens
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loginResponse = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(loginResponse);
  // Verify initial token information
  const initialAccessExpiration = new Date(loginResponse.token.expired_at);
  const adminId = loginResponse.id;
  // Step 3: Refresh the admin token using the refresh endpoint
  const refreshBody = {
    refresh_token: loginResponse.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;
  const refreshResponse = await authorize_admin_refresh(adminConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate the refresh response
  // New access token should have different value than original (token rotation)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  // New refresh token should have different value than original (token rotation)
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    loginResponse.token.refresh,
  );
  // Admin ID should remain the same
  TestValidator.equals(
    "admin ID remains the same",
    refreshResponse.id,
    adminId,
  );
  // New access token should have future expiration
  const newAccessExpiration = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "new access token has future expiration",
    newAccessExpiration > initialAccessExpiration,
  );
  // Step 5: Verify old refresh token is invalidated (token rotation)
  // Attempting to use the old refresh token should fail
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      await api.functional.discussionBoard.auth.admin.refresh(adminConnection, {
        body: {
          refresh_token: loginResponse.token.refresh,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
  // Step 6: Verify the new access token works for authenticated operations
  // Try to use the new access token to refresh again (should work)
  const secondRefreshBody = {
    refresh_token: refreshResponse.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;
  const secondRefreshResponse = await authorize_admin_refresh(adminConnection, {
    body: secondRefreshBody,
  });
  typia.assert(secondRefreshResponse);
  // Verify the token chain continues
  TestValidator.notEquals(
    "second refresh produces new tokens",
    secondRefreshResponse.token.access,
    refreshResponse.token.access,
  );
}
