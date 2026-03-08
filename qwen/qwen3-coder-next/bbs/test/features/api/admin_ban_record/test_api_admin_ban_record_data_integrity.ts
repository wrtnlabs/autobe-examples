import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
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

export async function test_api_admin_ban_record_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create test member for ban record testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create ban record
  const banReason = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 7,
  });
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        ban_reason: banReason,
        discussion_board_member_id: member.id,
        administrator_id: admin.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. Verify ban record data integrity
  TestValidator.equals("ban reason matches", banRecord.ban_reason, banReason);
  TestValidator.predicate(
    "has valid timestamp",
    new Date(banRecord.banned_at) <= new Date(),
  );
  TestValidator.equals("user ID matches", banRecord.user.id, member.id);
  // 5. Test ban record listing with pagination
  const listResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        discussion_board_member_id: member.id,
        ban_reason: banRecord.ban_reason,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(listResult);
  // 6. Verify pagination integrity
  TestValidator.predicate(
    "list has at least 1 record",
    listResult.data.length >= 1,
  );
  TestValidator.equals(
    "record count matches",
    listResult.pagination.records,
    listResult.data.length,
  );
}
