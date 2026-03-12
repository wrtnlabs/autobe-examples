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
 * Test that an authenticated administrator can update the ban reason while the ban is still active.
 *
 * 1. Register and authenticate as an administrator (banning_admin)
 * 2. Register a member account (target_member) to be banned
 * 3. As banning_admin, create a ban record for target_member with an initial ban reason
 * 4. Verify the ban record exists with the initial ban reason and unbanned_at as null
 * 5. As banning_admin, update the ban record with a new, more detailed ban reason
 * 6. Verify the response returns the updated ban record with the new ban reason
 * 7. Verify the banned_at, banned_by, and actor_type fields remain unchanged (immutable)
 * 8. Verify the unbanned_at field remains null (ban still active)
 * 9. Verify the updated_at timestamp was modified
 */
export async function test_api_ban_record_update_reason_while_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Register a member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create a ban record for the member with initial reason
  const initialReason = "Violation of community guidelines - spam posting";
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: memberAuth.id,
          ban_reason: initialReason,
        },
      },
    );
  typia.assert(banRecord);
  // 4. Verify initial ban record state
  TestValidator.equals(
    "initial ban reason",
    banRecord.ban_reason,
    initialReason,
  );
  TestValidator.predicate(
    "ban is active (unbanned_at is null)",
    banRecord.unbanned_at === null,
  );
  TestValidator.equals("actor type is member", banRecord.actor_type, "member");
  // Store immutable fields for later comparison
  const originalBannedAt = banRecord.banned_at;
  const originalBannedById = banRecord.bannedBy.id;
  const originalActorType = banRecord.actor_type;
  const originalUpdatedAt = banRecord.updated_at;
  // 5. Update the ban record with a new, more detailed reason
  const updatedReason =
    "Violation of community guidelines - spam posting and harassment of other members";
  const updatedBanRecord =
    await api.functional.discussionBoard.administrator.banRecords.update(
      adminConnection,
      {
        banRecordId: banRecord.id,
        body: {
          ban_reason: updatedReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBanRecord);
  // 6. Verify the ban reason was updated
  TestValidator.equals(
    "ban reason updated",
    updatedBanRecord.ban_reason,
    updatedReason,
  );
  // 7. Verify immutable fields remain unchanged
  TestValidator.equals(
    "banned_at unchanged",
    updatedBanRecord.banned_at,
    originalBannedAt,
  );
  TestValidator.equals(
    "banned_by unchanged",
    updatedBanRecord.bannedBy.id,
    originalBannedById,
  );
  TestValidator.equals(
    "actor_type unchanged",
    updatedBanRecord.actor_type,
    originalActorType,
  );
  // 8. Verify ban is still active (unbanned_at remains null)
  TestValidator.predicate(
    "ban still active (unbanned_at is null)",
    updatedBanRecord.unbanned_at === null,
  );
  // 9. Verify updated_at timestamp was modified
  TestValidator.notEquals(
    "updated_at changed",
    updatedBanRecord.updated_at,
    originalUpdatedAt,
  );
}
