import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
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
 * Test updating ban reason for a banned user.
 *
 * This test validates that administrators can update the ban reason to provide
 * accurate documentation or correct errors, preserving audit trail integrity.
 *
 * Workflow:
 * 1. Administrator registers and authenticates
 * 2. Create a member account to ban
 * 3. Administrator creates a ban record
 * 4. Administrator updates the ban reason
 * 5. Verify update succeeds with new reason
 */
export async function test_api_ban_reason_update_after_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
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
  // 2. Create member account to ban
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
  // 3. Administrator creates a ban
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: memberAuth.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban member matches", ban.member.id, memberAuth.id);
  // 4. Administrator updates the ban reason
  const updatedReason = RandomGenerator.paragraph({ sentences: 3 });
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
  // 5. Verify update succeeded with new reason
  TestValidator.equals("reason updated", updatedBan.reason, updatedReason);
  TestValidator.equals("ban id preserved", updatedBan.id, ban.id);
  TestValidator.equals("member unchanged", updatedBan.member.id, memberAuth.id);
  TestValidator.notEquals("reason changed", ban.reason, updatedBan.reason);
}
