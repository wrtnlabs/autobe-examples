import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test that an authenticated administrator can lift an active ban by setting the unbanned_at timestamp.
 *
 * Test Steps:
 * 1. Register and authenticate as an administrator (banning_admin)
 * 2. Register a member account (target_member) to be banned
 * 3. As banning_admin, create a ban record for target_member with a valid ban reason
 * 4. Verify the ban record shows unbanned_at as null (active ban)
 * 5. As banning_admin, update the ban record by setting unbanned_at to current timestamp
 * 6. Verify the response returns the updated ban record with unbanned_at populated
 * 7. Verify the banned_at, banned_by, and actor_type fields remain unchanged (immutable)
 * 8. Verify the updated_at timestamp was modified
 *
 * Expected Results:
 * - Ban record successfully updated with unbanned_at timestamp
 * - Immutable fields (banned_at, banned_by, actor_type) preserved unchanged
 * - Audit trail maintained with original ban information intact
 */
export async function test_api_ban_record_lift_ban_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Register a member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create a ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: memberAuth.id,
          ban_reason: "Violation of community guidelines - spam posting",
        },
      },
    );
  typia.assert(banRecord);
  // 4. Verify the ban record shows unbanned_at as null (active ban)
  TestValidator.equals(
    "unbanned_at is null for active ban",
    banRecord.unbanned_at,
    null,
  );
  TestValidator.equals("actor_type is member", banRecord.actor_type, "member");
  TestValidator.predicate(
    "banned_at is set",
    banRecord.banned_at !== undefined,
  );
  TestValidator.predicate(
    "banned_by exists",
    banRecord.bannedBy.id !== undefined,
  );
  // Store immutable fields for later comparison
  const originalBannedAt = banRecord.banned_at;
  const originalBannedBy = banRecord.bannedBy;
  const originalActorType = banRecord.actor_type;
  const originalCreatedAt = banRecord.created_at;
  // 5. Update the ban record by setting unbanned_at to current timestamp
  const liftedBanRecord =
    await api.functional.discussionBoard.administrator.banRecords.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          unbanned_at: new Date().toISOString(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(liftedBanRecord);
  // 6. Verify the response returns the updated ban record with unbanned_at populated
  TestValidator.predicate(
    "unbanned_at is populated after lift",
    liftedBanRecord.unbanned_at !== null,
  );
  TestValidator.predicate(
    "unbanned_at is valid date-time",
    liftedBanRecord.unbanned_at !== undefined,
  );
  // 7. Verify the banned_at, banned_by, and actor_type fields remain unchanged (immutable)
  TestValidator.equals(
    "banned_at remains unchanged",
    liftedBanRecord.banned_at,
    originalBannedAt,
  );
  TestValidator.equals(
    "banned_by.id remains unchanged",
    liftedBanRecord.bannedBy.id,
    originalBannedBy.id,
  );
  TestValidator.equals(
    "actor_type remains unchanged",
    liftedBanRecord.actor_type,
    originalActorType,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    liftedBanRecord.created_at,
    originalCreatedAt,
  );
  // 8. Verify the updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at was modified",
    liftedBanRecord.updated_at,
    banRecord.updated_at,
  );
}
