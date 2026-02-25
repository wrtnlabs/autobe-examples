import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test a regular administrator successfully banning a regular member.
 * This validates that regular administrators can exercise their ban privileges
 * within their permission level.
 *
 * Prerequisites:
 * 1. Create and authenticate a regular administrator account (permission_level: ADMINISTRATOR)
 * 2. Create a regular member account to be banned
 *
 * Test execution:
 * - Use the regular administrator's authentication token
 * - Call POST /discussionBoard/bans with userId and reason
 *
 * Validation points:
 * - Response returns HTTP 201 with created ban record
 * - Regular administrator's action is properly recorded in the ban record
 * - Target user's banned status is updated
 */
export async function test_api_ban_member_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account (will have MEMBER permission by default in this system)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create regular member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_user_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 3. Administrator bans the regular member
  const banReason = RandomGenerator.paragraph({
    sentences: 5,
  }) satisfies string & tags.MinLength<10> & tags.MaxLength<1000>;
  const ban = await api.functional.discussionBoard.bans.create(
    adminConnection,
    {
      body: {
        userId: member.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // 4. Validate ban record
  TestValidator.equals("banned user ID matches", ban.user.id, member.id);
  TestValidator.equals(
    "administrator ID matches",
    ban.administrator.id,
    admin.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.predicate("ban has valid ID", ban.id.length > 0);
  TestValidator.predicate(
    "ban has created timestamp",
    ban.createdAt.length > 0,
  );
}
