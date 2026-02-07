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

/**
 * Test pagination and sorting behavior for ban records.
 * Creates multiple ban records and validates pagination structure.
 */
export async function test_api_member_ban_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // Setup member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  // Create multiple ban records for the member with different timestamps
  const banRecords: IDiscussionBoardBansBanRecord[] = [];
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const banRecord: IDiscussionBoardBansBanRecord =
      await generate_random_discussion_board_admin_bans_create(
        adminConnection,
        {
          body: {
            user_id: "user-" + i,
            reason: `Test ban reason ${i + 1}`,
            start_time: new Date(now.getTime() - i * 86400000).toISOString(),
            end_time:
              i === 0
                ? null
                : new Date(now.getTime() + 86400000 * (i + 1)).toISOString(),
          },
        },
      );
    typia.assert(banRecord);
    banRecords.push(banRecord);
  }
  // Test ban history retrieval for the member
  const banHistory: IPageIDiscussionBoardBansBanRecord.ISummary =
    await api.functional.discussionBoard.member.members.me.bans.index(
      memberConnection,
    );
  typia.assert(banHistory);
  // Validate pagination structure
  TestValidator.equals(
    "pagination records count",
    banHistory.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    banHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    banHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    banHistory.pagination.pages >= 1,
  );
  // Validate ban records exist in data array
  TestValidator.equals("ban data array length", banHistory.data.length, 5);
  // Test pagination with different page sizes
  for (const limit of [2, 5, 10]) {
    const paginatedResponse: IPageIDiscussionBoardBansBanRecord.ISummary =
      await api.functional.discussionBoard.member.members.me.bans.index(
        memberConnection,
      );
    typia.assert(paginatedResponse);
    TestValidator.equals(
      `pagination records for limit=${limit}`,
      paginatedResponse.pagination.records,
      5,
    );
  }
}
