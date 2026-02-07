import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test deletion of a revoked ban record.
 * 1. Create an administrator account and authenticate
 * 2. Create a ban record with 'revoked' status
 * 3. Delete the revoked ban record
 * 4. Verify the deletion returns complete ban record with revocation details
 */
export async function test_api_admin_ban_record_deletion_revoked_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a revoked ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: null, // Use null for revoked records to indicate permanent ban
          ban_status: "revoked" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Delete the revoked ban record
  const deletedRecord =
    await api.functional.discussionBoard.admin.ban_records.erase(
      adminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(deletedRecord);
  // 4. Validate revocation details are present
  TestValidator.equals("ban record ID matches", deletedRecord.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    deletedRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban status is revoked",
    deletedRecord.ban_status,
    "revoked",
  );
  // Proper null checking without assertions
  if (deletedRecord.revoked_at != null) {
    TestValidator.predicate(
      "revoked_at is valid date",
      new Date(deletedRecord.revoked_at).getTime() > 0,
    );
  }
  if (deletedRecord.revoked_reason != null) {
    TestValidator.predicate(
      "revoked_reason is not empty",
      deletedRecord.revoked_reason.length > 0,
    );
  }
  TestValidator.notEquals("revoked_at is set", deletedRecord.revoked_at, null);
  TestValidator.notEquals(
    "revoked_reason is set",
    deletedRecord.revoked_reason,
    null,
  );
}