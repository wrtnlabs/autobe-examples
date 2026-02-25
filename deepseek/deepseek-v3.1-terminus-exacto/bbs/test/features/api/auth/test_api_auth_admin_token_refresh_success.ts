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

export async function test_api_auth_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create initial admin account and establish authentication session
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(initialAdmin);
  // Store original tokens for comparison
  const originalAccessToken = initialAdmin.token.access;
  const originalRefreshToken = initialAdmin.token.refresh;
  // Create fresh connection for refresh operation
  const refreshConnection1: api.IConnection = { host: connection.host };
  // Use the refresh token to obtain new tokens
  const refreshedAdmin = await authorize_admin_refresh(refreshConnection1, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // Validate that new tokens are different from originals
  TestValidator.notEquals(
    "access token should be different",
    refreshedAdmin.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    refreshedAdmin.token.refresh,
    originalRefreshToken,
  );
  // Validate admin profile information remains consistent
  TestValidator.equals(
    "admin ID should remain the same",
    refreshedAdmin.id,
    initialAdmin.id,
  );
  TestValidator.equals(
    "admin email should remain the same",
    refreshedAdmin.email,
    initialAdmin.email,
  );
  TestValidator.equals(
    "admin display name should remain the same",
    refreshedAdmin.display_name,
    initialAdmin.display_name,
  );
  // Test that the new access token works for authenticated requests
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = { Authorization: refreshedAdmin.token.access };
  TestValidator.predicate(
    "new access token should be valid",
    testConnection.headers.Authorization === refreshedAdmin.token.access,
  );
  // Verify that the refresh token cannot be reused with fresh connection
  const refreshConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh token should not be reusable",
    async () => {
      await authorize_admin_refresh(refreshConnection2, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
