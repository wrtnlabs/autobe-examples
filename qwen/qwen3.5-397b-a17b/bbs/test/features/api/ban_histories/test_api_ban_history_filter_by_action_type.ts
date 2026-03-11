import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanHistory";
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
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test filtering ban history audit trail by action type (banned vs unbanned).
 *
 * **Setup:**
 * 1. Create an administrator account via /discussionBoard/auth/admin/join
 * 2. Create multiple member accounts for testing via /discussionBoard/auth/member/join
 * 3. Create multiple ban records via /discussionBoard/admin/bans (banning different members)
 * 4. Unban some members via /discussionBoard/admin/bans/{banId} to create mixed action types
 *
 * **Test Execution - Filter by 'banned':**
 * 1. Administrator queries ban history with action filter set to 'banned'
 * 2. Verify response contains only ban imposition records (action: 'banned')
 * 3. Verify no unban records appear in the filtered results
 * 4. Verify pagination correctly reflects filtered record count
 *
 * **Test Execution - Filter by 'unbanned':**
 * 1. Administrator queries ban history with action filter set to 'unbanned'
 * 2. Verify response contains only ban removal records (action: 'unbanned')
 * 3. Verify no ban imposition records appear in the filtered results
 * 4. Verify reason field may be null for unban actions per business rules
 *
 * **Business Logic Validations:**
 * - Action type filtering correctly isolates banned vs unbanned events
 * - Pagination metadata accurately reflects filtered result counts
 * - Both action types are queryable independently
 * - Audit trail maintains complete history regardless of current ban status
 */
export async function test_api_ban_history_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create member accounts to be banned
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2);
  // 3. Create ban records for both members
  const ban1 = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member1.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban1);
  const ban2 = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member2.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban2);
  // 4. Unban one member (ban1) to create unbanned action type
  await api.functional.discussionBoard.admin.bans.update(adminConnection, {
    banId: ban1.id,
    body: {} satisfies IDiscussionBoardBan.IUpdate,
  });
  // 5. Test filtering by 'banned' action type
  const bannedHistory =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          action: "banned",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(bannedHistory);
  // Validate banned filter results
  TestValidator.predicate(
    "banned history has records",
    bannedHistory.data.length > 0,
  );
  TestValidator.predicate(
    "all banned records have action 'banned'",
    bannedHistory.data.every((record) => record.action === "banned"),
  );
  TestValidator.equals(
    "banned pagination records count",
    bannedHistory.pagination.records,
    bannedHistory.data.length,
  );
  // 6. Test filtering by 'unbanned' action type
  const unbannedHistory =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          action: "unbanned",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(unbannedHistory);
  // Validate unbanned filter results
  TestValidator.predicate(
    "unbanned history has records",
    unbannedHistory.data.length > 0,
  );
  TestValidator.predicate(
    "all unbanned records have action 'unbanned'",
    unbannedHistory.data.every((record) => record.action === "unbanned"),
  );
  TestValidator.equals(
    "unbanned pagination records count",
    unbannedHistory.pagination.records,
    unbannedHistory.data.length,
  );
  // 7. Validate that reason may be null for unban actions
  const unbannedRecord = unbannedHistory.data[0];
  TestValidator.predicate(
    "unbanned record reason can be null or string",
    unbannedRecord.reason === null ||
      unbannedRecord.reason === undefined ||
      typeof unbannedRecord.reason === "string",
  );
  // 8. Test without action filter (should return both types)
  const allHistory =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate(
    "all history contains both action types",
    allHistory.data.length >=
      bannedHistory.data.length + unbannedHistory.data.length,
  );
  TestValidator.predicate(
    "all history has at least one banned record",
    allHistory.data.some((record) => record.action === "banned"),
  );
  TestValidator.predicate(
    "all history has at least one unbanned record",
    allHistory.data.some((record) => record.action === "unbanned"),
  );
}
