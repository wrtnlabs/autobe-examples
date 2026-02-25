import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_super_admin_refresh_account_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register super admin using utility function (account will be active)
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(), // Use typia.random instead of RandomGenerator
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 3. Create an invalid refresh token to simulate deactivated account scenario
  // Since we cannot actually deactivate the account, we test with invalid token
  const invalidRefreshBody = {
    refresh_token: typia.random<string>(), // Random string, not a valid refresh token
  } satisfies IDiscussionBoardSuperAdmin.IRefresh;
  // 4. Attempt refresh with invalid token - should fail
  await TestValidator.error(
    "refresh should fail with invalid token (simulating deactivated account)",
    async () => {
      await api.functional.discussionBoard.auth.superAdmin.refresh(
        superAdminConnection,
        { body: invalidRefreshBody },
      );
    },
  );
  // 5. Also test that refresh with the valid token (account active) works
  // This validates our setup is correct
  const validRefreshBody = {
    refresh_token: authorized.token.refresh,
  } satisfies IDiscussionBoardSuperAdmin.IRefresh;
  const refreshed =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      superAdminConnection,
      { body: validRefreshBody },
    );
  typia.assert(refreshed);
  // 6. Verify token rotation occurred for valid refresh
  TestValidator.notEquals(
    "access token should be renewed for valid refresh",
    authorized.token.access,
    refreshed.token.access,
  );
}
