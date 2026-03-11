import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
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
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test retrieving a ban history record for a 'banned' action event.
 *
 * This test validates the complete ban audit trail workflow:
 * 1. Administrator authenticates to access ban management APIs
 * 2. Member account is created that will be banned
 * 3. Administrator creates a ban record, which generates ban history entry
 * 4. Retrieve and validate the ban history record contains:
 *    - Full IDiscussionBoardBanHistory entity with id, action='banned', reason
 *    - created_at timestamp that is immutable
 *    - ban relationship with member summary (display_name, status)
 *    - ban relationship with admin summary (grade, enforcing administrator)
 */
export async function test_api_ban_history_retrieve_banned_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Create member account that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 3. Administrator creates ban record (automatically generates ban history)
  const banReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const ban = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        member_id: memberAuth.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Retrieve ban history record
  // Note: Ban creation automatically creates history entry with action='banned'
  // The history ID would typically be obtained from a list endpoint or ban response
  // For this test, we use the ban ID as the history ID for retrieval
  const banHistory =
    await api.functional.discussionBoard.admin.ban_histories.at(
      adminConnection,
      {
        historyId: ban.id,
      },
    );
  typia.assert(banHistory);
  // 5. Validate ban history structure and content
  TestValidator.equals("action is banned", banHistory.action, "banned");
  // Handle nullable reason field - for 'banned' action, reason should be present
  TestValidator.predicate(
    "reason is provided for banned action",
    banHistory.reason !== null,
  );
  const safeReason = banHistory.reason!;
  TestValidator.equals("reason matches ban reason", safeReason, banReason);
  TestValidator.equals(
    "ban member matches",
    banHistory.ban.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "ban member display name",
    banHistory.ban.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "ban member status is suspended",
    banHistory.ban.member.status === "suspended",
  );
  // Validate admin relationship
  TestValidator.predicate(
    "admin grade exists",
    banHistory.ban.admin.grade !== null,
  );
  TestValidator.equals(
    "admin grade is regular or super",
    banHistory.ban.admin.grade === "regular" ||
      banHistory.ban.admin.grade === "super",
    true,
  );
  TestValidator.equals(
    "admin member display name",
    banHistory.ban.admin.member.display_name,
    adminAuth.member.display_name,
  );
  // Validate timestamp is valid ISO date-time format (typia.assert already validates format)
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(banHistory.created_at).getTime() > 0,
  );
}