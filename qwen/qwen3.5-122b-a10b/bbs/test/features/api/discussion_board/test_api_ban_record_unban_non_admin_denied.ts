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
 * Test that a non-administrator user cannot unban users.
 *
 * This test validates the authorization requirement that only administrators
 * can perform unban operations on ban records.
 */
export async function test_api_ban_record_unban_non_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member account (non-admin, no unban permissions)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an admin account and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Create a second member account (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create a ban record for the second member as admin
  const banRecord =
    await api.functional.discussionBoard.admin.admin.bans.create(
      adminConnection,
      {
        body: {
          discussionBoardMemberId: bannedMemberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban record is created with unbanned_at as null
  TestValidator.equals("ban is active", banRecord.unbanned_at, null);
  // 5. Attempt to call PUT /discussionBoard/admin/ban-records/{banId}
  // using the regular member's authentication token (should be denied)
  await TestValidator.httpError(
    "non-admin cannot unban users",
    403,
    async () => {
      await api.functional.discussionBoard.admin.ban_records.update(
        memberConnection,
        {
          banId: banRecord.id,
          body: {
            unbanned_at: new Date().toISOString(),
          } satisfies IDiscussionBoardBanRecord.IUpdate,
        },
      );
    },
  );
  // 6. Verify the ban record remains unchanged (unbanned_at still NULL)
  // Re-fetch the ban record to verify it wasn't modified
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {},
      },
    );
  typia.assert(updatedBanRecord);
  TestValidator.equals(
    "ban record unchanged",
    updatedBanRecord.unbanned_at,
    null,
  );
}
