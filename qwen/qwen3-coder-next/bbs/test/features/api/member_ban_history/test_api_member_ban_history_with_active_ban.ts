import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
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
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_member_ban_history_with_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for banning
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  } satisfies IDiscussionBoardAdmin.IJoin);
  // 2. Create member user to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {},
    } satisfies IDiscussionBoardMember.IJoin);
  // 3. Login as member to get member ID
  const memberWithId: api.IConnection = { host: connection.host };
  await authorize_member_login(memberWithId, {
    body: {},
  } satisfies IDiscussionBoardMember.ILogin);
  // 4. Ban the member user
  const banRecord: IDiscussionBoardBansBanRecord =
    await api.functional.discussionBoard.admin.bans.create(adminConnection, {
      body: {
        user_id: "00000000-0000-0000-0000-000000000000",
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    });
  typia.assert(banRecord);
  // 5. Login as banned member
  await authorize_member_login(memberConnection, {
    body: {},
  } satisfies IDiscussionBoardMember.ILogin);
  // 6. Retrieve ban history
  const banHistory: IPageIDiscussionBoardBansBanRecord.ISummary =
    await api.functional.discussionBoard.member.members.me.bans.index(
      memberConnection,
    );
  typia.assert(banHistory);
  // 7. Validate results
  TestValidator.equals("has ban history", banHistory.data.length, 1);
}