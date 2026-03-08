import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_unban_already_unbanned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 3. Ban the member account using super admin
  const banRecord =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member.id,
          ban_reason: "Test ban reason",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord);
  // 4. Unban the member (first unban) using super admin
  await api.functional.discussionBoard.superAdmin.actors.ban.erase(
    superAdminConnection,
    {
      actorId: member.id,
      body: {
        ban_reason: "Test ban reason",
        unban_reason: "Test unban reason",
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  // 5. Attempt to unban again (second unban) - should fail
  await TestValidator.error(
    "second unban should fail - ban is already lifted",
    async () => {
      await api.functional.discussionBoard.superAdmin.actors.ban.erase(
        superAdminConnection,
        {
          actorId: member.id,
          body: {
            ban_reason: "Test ban reason",
            unban_reason: "Second unban attempt",
          } satisfies IDiscussionBoardBanRecord.IUpdate,
        },
      );
    },
  );
}
