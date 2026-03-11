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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

export async function test_api_ban_history_retrieve_unbanned_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_admin_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create initial ban record
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: memberAuth.member.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Store original ban timestamp for comparison
  const originalBannedAt = ban.banned_at;
  // 5. Update the ban to unban the user (setting deleted_at lifts the ban)
  const updatedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: ban.id,
      body: {
        reason: "User has been unbanned after administrative review",
      } satisfies IDiscussionBoardBan.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // 6. Validate ban was lifted (unbanned)
  TestValidator.predicate(
    "ban was lifted (deleted_at set)",
    updatedBan.deleted_at !== null,
  );
  TestValidator.equals(
    "member status active after unban",
    updatedBan.member.status,
    "active",
  );
  TestValidator.equals("ban ID preserved after update", updatedBan.id, ban.id);
  TestValidator.equals(
    "ban reason updated",
    updatedBan.reason,
    "User has been unbanned after administrative review",
  );
  TestValidator.predicate(
    "original ban timestamp preserved",
    updatedBan.banned_at === originalBannedAt,
  );
  TestValidator.predicate(
    "unban timestamp after original ban",
    new Date(updatedBan.deleted_at!) > new Date(originalBannedAt),
  );
  // 7. Validate ban relationship structure
  TestValidator.predicate(
    "ban has member reference",
    updatedBan.member.id !== undefined,
  );
  TestValidator.predicate(
    "ban has admin reference",
    updatedBan.admin.id !== undefined,
  );
  TestValidator.equals(
    "member ID matches banned user",
    updatedBan.member.id,
    memberAuth.member.id,
  );
}
