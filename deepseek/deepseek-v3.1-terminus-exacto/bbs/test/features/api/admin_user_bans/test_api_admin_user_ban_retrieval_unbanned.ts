import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_admin_user_ban_retrieval_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Member setup (simplified since we only need member ID)
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
  // 3. Create active ban record using SDK function directly
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban = await api.functional.discussionBoard.admin.user_bans.create(
    adminConnection,
    {
      body: {
        member_id: member.id,
        reason: banReason,
        expires_at: null,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify initial ban status is active
  TestValidator.equals("initial ban status", ban.status, "active");
  TestValidator.equals("initial ban reason", ban.reason, banReason);
  TestValidator.predicate(
    "unbanned_at should be null initially",
    ban.unbanned_at === null,
  );
  // 4. Manually remove/unban the user
  await api.functional.discussionBoard.admin.user_bans.erase(adminConnection, {
    banId: ban.id,
  });
  // 5. Retrieve the ban record and verify status is 'removed'
  const retrievedBan = await api.functional.discussionBoard.admin.user_bans.at(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate ban record after removal
  TestValidator.equals(
    "ban status after removal",
    retrievedBan.status,
    "removed",
  );
  TestValidator.predicate(
    "unbanned_at should be populated",
    retrievedBan.unbanned_at !== null,
  );
  TestValidator.equals("ban reason preserved", retrievedBan.reason, banReason);
  TestValidator.equals("ban ID preserved", retrievedBan.id, ban.id);
  TestValidator.equals(
    "member ID preserved",
    retrievedBan.member?.id,
    member.id,
  );
  TestValidator.predicate(
    "banned_at preserved",
    retrievedBan.banned_at !== null,
  );
}
