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
 * Test the retrieval of a revoked ban record by an administrator.
 * Create a ban record with 'revoked' status including revocation details.
 * Verify that the retrieved record shows ban_status as 'revoked' and includes
 * the revocation metadata. Check that all original ban information is preserved
 * along with the revocation details.
 */
export async function test_api_admin_ban_record_retrieval_revoked(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create a ban record with revoked status directly
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "revoked" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Retrieve the ban record
  const retrievedRecord =
    await api.functional.discussionBoard.admin.ban_records.at(adminConnection, {
      banRecordId: banRecord.id,
    });
  typia.assert(retrievedRecord);
  // Validate the retrieved record has revoked status
  TestValidator.equals(
    "ban status is revoked",
    retrievedRecord.ban_status,
    "revoked",
  );
  // Validate all original information is preserved
  TestValidator.equals(
    "ban record ID matches",
    retrievedRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason preserved",
    retrievedRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban duration preserved",
    retrievedRecord.ban_duration_days,
    banRecord.ban_duration_days,
  );
  TestValidator.equals(
    "created at preserved",
    retrievedRecord.created_at,
    banRecord.created_at,
  );
  // Validate revocation metadata exists
  TestValidator.predicate(
    "revoked_at is set",
    retrievedRecord.revoked_at !== null,
  );
  TestValidator.predicate(
    "revoked_reason is set",
    retrievedRecord.revoked_reason !== null,
  );
  // Validate revoked_at is a proper date-time format
  if (retrievedRecord.revoked_at !== null) {
    TestValidator.predicate(
      "revoked_at is valid ISO date",
      !isNaN(new Date(retrievedRecord.revoked_at!).getTime()),
    );
  }
}