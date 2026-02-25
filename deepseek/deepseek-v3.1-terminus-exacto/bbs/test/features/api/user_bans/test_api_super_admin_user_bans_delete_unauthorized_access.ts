import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_super_admin_user_bans_delete_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator for ban setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create user to be banned
  const userToBanConnection: api.IConnection = { host: connection.host };
  const userToBan = await authorize_user_join(userToBanConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userToBan);
  // Step 3: Create ban record using super admin
  const banRecord = await api.functional.discussionBoard.admin.user_bans.create(
    superAdminConnection,
    {
      body: {
        bannedUserId: userToBan.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "permanent" as const,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Step 4: Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Step 5: Test unauthorized deletion attempt by regular admin
  await TestValidator.error(
    "regular admin cannot delete ban records",
    async () => {
      await api.functional.discussionBoard.superAdmin.user_bans.erase(
        regularAdminConnection,
        {
          banId: banRecord.id,
        },
      );
    },
  );
  // Step 6: Create regular user account
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(regularUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(regularUser);
  // Step 7: Test unauthorized deletion attempt by regular user
  await TestValidator.error(
    "regular user cannot delete ban records",
    async () => {
      await api.functional.discussionBoard.superAdmin.user_bans.erase(
        regularUserConnection,
        {
          banId: banRecord.id,
        },
      );
    },
  );
  // Step 8: Verify ban integrity by successfully deleting it with super admin
  // This demonstrates the ban was preserved through unauthorized attempts
  await api.functional.discussionBoard.superAdmin.user_bans.erase(
    superAdminConnection,
    {
      banId: banRecord.id,
    },
  );
}
