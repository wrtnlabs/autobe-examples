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

export async function test_api_ban_history_filter_by_ban_id_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
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
  typia.assert(admin);
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 3. Create first ban record
  const ban1 = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban1);
  // 4. Unban the member (update ban to lift restriction)
  const unban = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: ban1.id,
      body: {
        reason: `Unbanned: ${RandomGenerator.paragraph({ sentences: 1 })}`,
      } satisfies IDiscussionBoardBan.IUpdate,
    },
  );
  typia.assert(unban);
  // 5. Create second ban record (re-ban same member)
  const ban2 = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: `Re-banned: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban2);
  // 6. Test filtering by ban_id (first ban)
  const historyByBanId =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          discussion_board_ban_id: ban1.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(historyByBanId);
  TestValidator.predicate(
    "ban_id filter returns history entries",
    () => historyByBanId.data.length > 0,
  );
  TestValidator.predicate("all entries match ban_id filter", () =>
    historyByBanId.data.every((entry) => entry.ban.id === ban1.id),
  );
  // 7. Test filtering by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const historyByDateRange =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(historyByDateRange);
  TestValidator.predicate(
    "date range filter returns entries",
    () => historyByDateRange.data.length > 0,
  );
  TestValidator.predicate("all entries within date range", () =>
    historyByDateRange.data.every(
      (entry) =>
        new Date(entry.created_at) >= yesterday &&
        new Date(entry.created_at) <= tomorrow,
    ),
  );
  // 8. Test combined filters (ban_id + date range)
  const historyCombined =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          discussion_board_ban_id: ban1.id,
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(historyCombined);
  TestValidator.predicate(
    "combined filters return matching entries",
    () => historyCombined.data.length > 0,
  );
  TestValidator.predicate("all entries match ban_id in combined filter", () =>
    historyCombined.data.every((entry) => entry.ban.id === ban1.id),
  );
  // 9. Test reason text search
  const historyByReason =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          reason: "Re-banned",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(historyByReason);
  TestValidator.predicate("reason search returns matching entries", () =>
    historyByReason.data.some(
      (entry) => entry.reason?.toLowerCase().includes("re-banned") ?? false,
    ),
  );
  // 10. Test action type filter
  const historyBanned =
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
  typia.assert(historyBanned);
  TestValidator.predicate("action filter returns banned entries", () =>
    historyBanned.data.every((entry) => entry.action === "banned"),
  );
  // 11. Verify pagination metadata
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      historyByBanId.pagination.current >= 1 &&
      historyByBanId.pagination.limit > 0 &&
      historyByBanId.pagination.records >= 0 &&
      historyByBanId.pagination.pages >= 0,
  );
}
