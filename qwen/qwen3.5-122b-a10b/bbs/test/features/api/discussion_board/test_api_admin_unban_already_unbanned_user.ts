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
 * Test that an administrator receives an error when attempting to unban a user who is already unbanned.
 *
 * Workflow:
 * 1. Create an admin account and authenticate
 * 2. Create a member account
 * 3. Admin creates a ban record for the member
 * 4. Admin successfully unbans the member (first unban)
 * 5. Admin attempts to unban the same member again using the same ban record ID
 * 6. Verify the second unban request returns a 400 Bad Request error indicating the user is already unbanned
 */
export async function test_api_admin_unban_already_unbanned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
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
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin creates a ban record for the member
  const banRecord =
    await generate_random_discussion_board_admin_admin_bans_create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: memberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Admin successfully unbans the member (first unban)
  const firstUnban =
    await api.functional.discussionBoard.admin.ban_records.unban(
      adminConnection,
      {
        banId: banRecord.id,
      },
    );
  typia.assert(firstUnban);
  // Verify the ban record now has unbanned_at set
  TestValidator.predicate(
    "first unban sets unbanned_at",
    firstUnban.unbanned_at !== null,
  );
  // 5. Admin attempts to unban the same member again using the same ban record ID
  // 6. Verify the second unban request returns a 400 Bad Request error
  await TestValidator.httpError(
    "already unbanned user returns 400",
    400,
    async () => {
      await api.functional.discussionBoard.admin.ban_records.unban(
        adminConnection,
        {
          banId: banRecord.id,
        },
      );
    },
  );
}
