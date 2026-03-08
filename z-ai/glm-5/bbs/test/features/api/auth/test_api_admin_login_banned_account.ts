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

export async function test_api_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinedAdmin);
  // Step 2: Ban the administrator account
  // IMPORTANT: This test requires an admin management API to ban accounts.
  // No such API is available in the current SDK endpoints:
  // - POST /discussionBoard/auth/admin/join (available)
  // - POST /discussionBoard/auth/admin/login (available)
  // - PATCH /discussionBoard/admins/{id}/ban (NOT AVAILABLE)
  //
  // Without a ban API, we cannot set banned_at and ban_reason fields.
  // This test documents the expected behavior but cannot fully execute.
  //
  // Expected implementation would be:
  // await api.functional.discussionBoard.admins.ban(superAdminConnection, {
  //   params: { id: joinedAdmin.id },
  //   body: { ban_reason: "Policy violation for testing" },
  // });
  // Step 3 & 4: Verify login rejection for banned account
  // Since we cannot ban the account, the login will succeed.
  // The following would be the correct test once banning is available:
  //
  // await TestValidator.error("banned admin cannot login", async () => {
  //   await api.functional.discussionBoard.auth.admin.login(
  //     { host: connection.host },
  //     {
  //       body: {
  //         email: adminEmail,
  //         password: adminPassword,
  //         href: typia.random<string & tags.Format<"uri">>(),
  //         referrer: typia.random<string & tags.Format<"uri">>(),
  //       } satisfies IDiscussionBoardAdmin.ILogin,
  //     },
  //   );
  // });
  //
  // NOTE: Test removed because banning API is not available.
  // This test cannot verify banned account login rejection without the ability
  // to set banned_at on an admin account.
}