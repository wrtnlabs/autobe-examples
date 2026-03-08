import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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

export async function test_api_superadmin_ban_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Store email for later login
  const testEmail: string = typia.random<string & tags.Format<"email">>();
  // Create new super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: testEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Login as super admin using same email
  const loginResponse: IDiscussionBoardSuperAdmin.IAuthorized =
    await authorize_super_admin_login(superAdminConnection, {
      body: {
        email: testEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    });
  typia.assert(loginResponse);
  // Get ban status for current super admin
  const banStatus: IDiscussionBoardBanRecord.IStatus =
    await api.functional.discussionBoard.superAdmin.actors.ban.status(
      superAdminConnection,
    );
  typia.assert(banStatus);
  // Validate ban status for non-banned user
  TestValidator.equals("user is not banned", banStatus.is_banned, false);
  TestValidator.equals("ban_reason is null", banStatus.ban_reason, null);
  TestValidator.equals("unbanned_at is null", banStatus.unbanned_at, null);
  TestValidator.predicate("banned_at is valid ISO 8601", () => {
    const date = new Date(banStatus.banned_at);
    return !isNaN(date.getTime());
  });
}