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
 * Test a super administrator banning a regular member for violating community guidelines.
 * This validates the primary success path of the ban functionality.
 *
 * Prerequisites:
 * 1. Create and authenticate a super administrator account - this will be the banning administrator
 * 2. Create a regular member account - this will be the target user to be banned
 *
 * Test execution:
 * - Use the super administrator's authentication token
 * - Call POST /discussionBoard/bans with userId and reason
 *
 * Validation:
 * - Ban record includes correct user, administrator, and reason
 * - Ban record has valid timestamps
 */
export async function test_api_ban_member_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account (the banning administrator)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminDisplayName = RandomGenerator.name();
  const superAdmin = await api.functional.discussionBoard.auth.user.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        displayName: superAdminDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Update superAdminConnection with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // Step 2: Create regular member account (the target user to be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const member = await api.functional.discussionBoard.auth.user.join(
    { host: connection.host },
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        displayName: memberDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Super administrator bans the regular member
  const banReason =
    "Repeated violation of community guidelines after multiple warnings";
  const banRecord = await api.functional.discussionBoard.bans.create(
    superAdminConnection,
    {
      body: {
        userId: member.id,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // Step 4: Validate ban record
  TestValidator.equals("banned user ID", banRecord.user.id, member.id);
  TestValidator.equals("banned user email", banRecord.user.email, member.email);
  TestValidator.equals(
    "banned user displayName",
    banRecord.user.displayName,
    member.displayName,
  );
  TestValidator.equals(
    "administrator ID",
    banRecord.administrator.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "administrator email",
    banRecord.administrator.email,
    superAdmin.email,
  );
  TestValidator.equals("ban reason", banRecord.reason, banReason);
  TestValidator.predicate(
    "createdAt is valid date-time",
    !isNaN(Date.parse(banRecord.createdAt)),
  );
}