import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test administrator can successfully unban a previously banned user.
 *
 * Workflow:
 * 1. Create admin account and authenticate
 * 2. Create member account
 * 3. Admin creates ban record for the member with a reason
 * 4. Admin calls the unban endpoint with the ban record ID
 * 5. Verify the ban record's unbanned_at timestamp is set
 * 6. Verify the member's ban_status is updated to 'active' and ban_reason is null
 * 7. Verify the member can successfully log in after being unbanned
 */
export async function test_api_admin_unban_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  TestValidator.equals(
    "member ban status initial",
    memberAuth.banStatus,
    "active",
  );
  // 3. Admin creates ban record for the member
  const banRecord =
    await api.functional.discussionBoard.admin.admin.bans.create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: memberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  TestValidator.equals(
    "ban record member id",
    banRecord.discussion_board_member_id,
    memberAuth.id,
  );
  TestValidator.predicate("ban record has reason", banRecord.reason.length > 0);
  TestValidator.predicate(
    "ban record unbanned_at is null",
    banRecord.unbanned_at === null,
  );
  // 4. Admin calls the unban endpoint
  const unbanRecord =
    await api.functional.discussionBoard.admin.ban_records.unban(
      adminConnection,
      {
        banId: banRecord.id,
      },
    );
  typia.assert(unbanRecord);
  // 5. Verify the ban record's unbanned_at timestamp is set
  TestValidator.predicate(
    "unban record has unbanned_at",
    unbanRecord.unbanned_at !== null,
  );
  TestValidator.predicate(
    "unbanned_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      unbanRecord.unbanned_at!,
    ),
  );
  // 6. Verify the member's ban_status is updated to 'active' and ban_reason is null
  const memberAfterUnban =
    await api.functional.discussionBoard.auth.member.login(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(memberAfterUnban);
  TestValidator.equals(
    "member ban status after unban",
    memberAfterUnban.banStatus,
    "active",
  );
  TestValidator.equals(
    "member ban reason after unban",
    memberAfterUnban.banReason,
    undefined,
  );
  // 7. Verify the member can successfully log in after being unbanned
  // Already verified above by successful login
  TestValidator.predicate(
    "member can login after unban",
    memberAfterUnban.token.access.length > 0,
  );
}
