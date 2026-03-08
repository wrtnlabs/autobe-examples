import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_admin_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create member user
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 3. Admin bans the member
  const banConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(banConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const banRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      banConnection,
      {
        body: {
          discussion_board_member_id: member.id,
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord);
  // Verify member is banned
  TestValidator.equals("member is banned", member.is_banned, true);
  TestValidator.equals("ban record exists", banRecord.user.id, member.id);
  TestValidator.equals(
    "ban reason provided",
    banRecord.ban_reason.length > 0,
    true,
  );
  TestValidator.equals("ban record not deleted", banRecord.deleted_at, null);
  // 4. Admin unbans the member
  await api.functional.discussionBoard.admin.actors.ban.erase(banConnection, {
    actorId: member.id,
  });
  // 5. Verify member can log in after unban
  const updatedMember = await api.functional.discussionBoard.auth.member.login(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(updatedMember);
  // Verify member is no longer banned
  TestValidator.equals("member is unbanned", updatedMember.is_banned, false);
  TestValidator.equals("ban reason cleared", updatedMember.ban_reason, null);
}