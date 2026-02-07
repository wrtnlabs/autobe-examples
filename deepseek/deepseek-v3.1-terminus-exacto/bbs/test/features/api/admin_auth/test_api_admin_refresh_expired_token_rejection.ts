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

export async function test_api_admin_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create initial administrator account and session to obtain refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Extract the refresh token from the authorized response
  const validRefreshToken = authorizedAdmin.token.refresh;
  // Test 1: Attempt to refresh with an invalid/expired token
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh_token: "invalid_expired_refresh_token",
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
  // Test 2: Attempt to refresh with empty token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh_token: "",
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
  // Test 3: Attempt to refresh with malformed token format
  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh_token: "not_a_valid_jwt_token_format",
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
  // Control test: Verify that valid refresh token still works
  const refreshedAdmin = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // Verify token rotation occurred
  TestValidator.notEquals(
    "refresh token should be rotated after successful refresh",
    refreshedAdmin.token.refresh,
    validRefreshToken,
  );
  // Verify the admin identity remains consistent
  TestValidator.equals(
    "admin ID should remain the same after refresh",
    refreshedAdmin.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "admin email should remain the same after refresh",
    refreshedAdmin.email,
    authorizedAdmin.email,
  );
}
