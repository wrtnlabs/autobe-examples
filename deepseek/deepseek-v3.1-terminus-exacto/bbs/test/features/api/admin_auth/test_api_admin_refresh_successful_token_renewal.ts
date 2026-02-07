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

/**
 * Test the successful refresh of administrator authentication tokens.
 *
 * This test validates that when an administrator provides a valid refresh token,
 * the system generates new access and refresh tokens with updated expiration times
 * while maintaining the administrator's session state. The test verifies that the
 * new tokens are valid, the session metadata is preserved, and the administrator
 * can continue accessing protected resources with the new tokens.
 */
export async function test_api_admin_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial administrator account and obtain valid tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Use the refresh token to call the refresh endpoint
  const refreshResponse = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Validate that new tokens are generated
  TestValidator.notEquals(
    "refresh token should be renewed",
    initialAuth.token.refresh,
    refreshResponse.token.refresh,
  );
  TestValidator.notEquals(
    "access token should be renewed",
    initialAuth.token.access,
    refreshResponse.token.access,
  );
  // 4. Verify administrator profile information remains consistent
  TestValidator.equals(
    "administrator ID should remain the same",
    initialAuth.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "administrator email should remain the same",
    initialAuth.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "administrator display name should remain the same",
    initialAuth.display_name,
    refreshResponse.display_name,
  );
  // 5. Validate token expiration times are updated and in the future
  TestValidator.predicate(
    "new access token expiration should be in the future",
    () => {
      const newExpiredAt = new Date(refreshResponse.token.expired_at);
      return newExpiredAt > new Date();
    },
  );
  TestValidator.predicate(
    "new refreshable until should be in the future",
    () => {
      const newRefreshableUntil = new Date(
        refreshResponse.token.refreshable_until,
      );
      return newRefreshableUntil > new Date();
    },
  );
  // 6. Validate expiration times are different from original tokens
  TestValidator.notEquals(
    "access token expiration time should change",
    initialAuth.token.expired_at,
    refreshResponse.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until time should change",
    initialAuth.token.refreshable_until,
    refreshResponse.token.refreshable_until,
  );
  // 7. Verify the new access token is properly set in connection headers
  TestValidator.equals(
    "connection headers should contain new access token",
    adminConnection.headers?.Authorization,
    `Bearer ${refreshResponse.token.access}`,
  );
  // 8. Test that the old refresh token becomes invalid (refresh token rotation)
  await TestValidator.error(
    "old refresh token should become invalid",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
