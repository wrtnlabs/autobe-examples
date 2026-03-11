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

export async function test_api_ban_history_audit_trail_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
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
  // 2. Create member account that will be banned
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
  // 3. Create ban record (ban the member)
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Update ban reason to generate additional history entry
  const updatedReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: ban.id,
      body: {
        reason: updatedReason,
      } satisfies IDiscussionBoardBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 5. Query ban history audit trail
  const banHistory =
    await api.functional.discussionBoard.admin.ban_histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanHistory.IRequest,
      },
    );
  typia.assert(banHistory);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    banHistory.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    banHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    banHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    banHistory.pagination.pages >= 0,
  );
  // 7. Validate history records exist
  TestValidator.predicate("history has data", banHistory.data.length > 0);
  // 8. Validate ban action exists in history (ban creation generates 'banned' action)
  const hasBanAction = banHistory.data.some((h) => h.action === "banned");
  TestValidator.predicate("ban action exists in history", hasBanAction);
  // 9. Validate ban reason is preserved in history
  const banHistoryEntry = banHistory.data.find((h) => h.ban.id === ban.id);
  if (banHistoryEntry) {
    TestValidator.equals(
      "ban reason preserved",
      banHistoryEntry.reason,
      ban.reason,
    );
    // Validate ban reference includes member display name
    TestValidator.predicate(
      "ban has member display name",
      banHistoryEntry.ban.member.display_name === member.display_name,
    );
    // Validate ban reference includes administrator information
    TestValidator.predicate(
      "ban has admin grade",
      banHistoryEntry.ban.admin.grade !== undefined,
    );
  }
}
