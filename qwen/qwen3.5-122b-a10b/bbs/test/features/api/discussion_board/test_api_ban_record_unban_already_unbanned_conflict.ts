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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test attempting to unban a user who is already unbanned.
 * The workflow: (1) Admin authenticates via POST /discussionBoard/auth/admin/join,
 * (2) Create a member account via POST /discussionBoard/auth/member/join,
 * (3) Admin creates a ban record for the member via POST /discussionBoard/admin/ban-records,
 * (4) Admin unbans the user via PUT /discussionBoard/admin/ban-records/{banRecordId} with unbanned_at timestamp,
 * (5) Admin attempts to unban the same user again via PUT /discussionBoard/admin/ban-records/{banRecordId} with another unbanned_at timestamp,
 * (6) Verify the response returns 409 Conflict status code,
 * (7) Verify the error message indicates the user is already unbanned,
 * (8) Verify the original unbanned_at timestamp remains unchanged.
 * Business rule validation: system prevents duplicate unban operations, maintains data integrity by rejecting conflicting state changes.
 */
export async function test_api_ban_record_unban_already_unbanned_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Admin creates ban record for the member
  const banRecord =
    await api.functional.discussionBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: memberAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  TestValidator.predicate("ban is active", banRecord.unbanned_at === null);
  // 4. Admin unbans the user (first unban)
  const firstUnbanTimestamp = new Date().toISOString();
  const firstUnbanResult =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          unbanned_at: firstUnbanTimestamp,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(firstUnbanResult);
  TestValidator.equals(
    "first unban successful",
    firstUnbanResult.unbanned_at,
    firstUnbanTimestamp,
  );
  // 5. Admin attempts to unban again (should fail with 409 Conflict)
  const secondUnbanTimestamp = new Date(Date.now() + 1000).toISOString();
  await TestValidator.httpError(
    "duplicate unban returns 409 Conflict",
    409,
    async () => {
      await api.functional.discussionBoard.admin.ban_records.update(
        adminConnection,
        {
          banRecordId: banRecord.id,
          body: {
            unbanned_at: secondUnbanTimestamp,
          } satisfies IDiscussionBoardBanRecord.IUpdate,
        },
      );
    },
  );
  // 6. Verify the original unbanned_at timestamp remains unchanged
  const updatedBanRecord =
    await api.functional.discussionBoard.admin.ban_records.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {},
      },
    );
  typia.assert(updatedBanRecord);
  TestValidator.equals(
    "original unbanned_at remains unchanged",
    updatedBanRecord.unbanned_at,
    firstUnbanTimestamp,
  );
}
