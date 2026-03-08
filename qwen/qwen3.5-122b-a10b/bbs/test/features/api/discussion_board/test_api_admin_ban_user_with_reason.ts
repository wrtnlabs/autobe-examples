import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_user_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  // 1. Create admin account
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create member account to be banned
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 3. Login as admin to perform ban operation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 4. Ban the member with a reason
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banRecord =
    await api.functional.discussionBoard.admin.admin.bans.create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: memberJoinResult.id,
          reason: banReason,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Validate ban record structure
  TestValidator.equals("ban record has ID", banRecord.id !== undefined, true);
  TestValidator.equals(
    "ban record member ID matches",
    banRecord.discussion_board_member_id,
    memberJoinResult.id,
  );
  TestValidator.equals(
    "ban record admin ID matches",
    banRecord.discussion_board_admin_id,
    adminJoinResult.id,
  );
  TestValidator.predicate("ban record has reason", banRecord.reason.length > 0);
  TestValidator.equals(
    "ban record has banned_at",
    banRecord.banned_at !== undefined,
    true,
  );
  TestValidator.equals("unbanned_at is null", banRecord.unbanned_at, null);
  // 6. Verify banned member cannot login
  await TestValidator.error("banned member cannot login", async () => {
    await authorize_member_login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
}
