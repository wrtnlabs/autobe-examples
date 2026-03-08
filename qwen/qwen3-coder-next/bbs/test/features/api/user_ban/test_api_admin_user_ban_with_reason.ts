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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_user_ban_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoinOutput = await api.functional.discussionBoard.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminName,
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminJoinOutput);
  // Step 2: Create regular member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberName = RandomGenerator.name();
  const memberJoinOutput =
    await api.functional.discussionBoard.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberName,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberJoinOutput);
  // Step 3: Login as admin to establish admin session
  const adminLoginOutput =
    await api.functional.discussionBoard.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLoginOutput);
  // Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminLoginOutput.token.access,
    },
  };
  // Step 4: Ban the member user with detailed reason
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        ban_reason: banReason,
        discussion_board_member_id: memberJoinOutput.id,
        administrator_id: adminLoginOutput.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Step 5: Verify ban record details
  TestValidator.equals("ban reason matches", banRecord.ban_reason, banReason);
  TestValidator.equals(
    "banned user matches",
    banRecord.user.id,
    memberJoinOutput.id,
  );
  TestValidator.equals(
    "administrator matches",
    banRecord.administrator.id,
    adminLoginOutput.id,
  );
  TestValidator.predicate(
    "banned_at is set",
    banRecord.banned_at !== null && banRecord.banned_at !== undefined,
  );
  // Step 6: Verify banned user cannot login anymore
  await TestValidator.error("banned user login should fail", async () => {
    const freshMemberConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.auth.member.login(
      freshMemberConnection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      },
    );
  });
}
