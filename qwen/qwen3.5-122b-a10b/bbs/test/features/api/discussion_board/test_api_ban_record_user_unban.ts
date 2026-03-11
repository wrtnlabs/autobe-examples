import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test unbanning a previously banned user.
 * The workflow:
 * (1) Admin authenticates via /discussionBoard/auth/admin/join
 * (2) Admin creates a ban record for a member via POST /discussionBoard/admin/ban-records
 * (3) Admin unbans the user via PUT /discussionBoard/admin/ban-records/{banRecordId} by providing unbanned_at timestamp
 * (4) Verify the response contains unbanned_at set to current timestamp
 * (5) Verify the member's ban_status changes from 'banned' to 'active'
 * (6) Verify the member can successfully log in after unban
 *
 * Business rule validation: unbanned_at can only be set when currently null, user access is restored, ban record persists for audit trail.
 */
export async function test_api_ban_record_user_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
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
  // 2. Member setup - register a member account
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Verify member is initially active
  TestValidator.equals(
    "member ban_status is active",
    memberAuth.ban_status,
    "active",
  );
  // 3. Admin creates a ban record for the member
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: memberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban record is created with unbanned_at as null
  TestValidator.equals(
    "ban record unbanned_at is null",
    banRecord.unbanned_at,
    null,
  );
  TestValidator.equals(
    "member ban_status is banned",
    banRecord.member.ban_status,
    "banned",
  );
  // 4. Admin unbans the user by updating ban record with unbanned_at timestamp
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          unbanned_at: new Date().toISOString(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBanRecord);
  // 5. Verify the response contains unbanned_at set
  TestValidator.equals(
    "ban record has unbanned_at",
    updatedBanRecord.unbanned_at !== null,
    true,
  );
  TestValidator.predicate(
    "unbanned_at is valid timestamp",
    updatedBanRecord.unbanned_at !== null,
  );
  // 6. Verify the member can successfully log in after unban
  const memberAfterUnban = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberAfterUnban);
  TestValidator.equals(
    "member ban_status is active after unban",
    memberAfterUnban.ban_status,
    "active",
  );
  TestValidator.predicate(
    "member can login after unban",
    memberAfterUnban.access_token.length > 0,
  );
}
