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
 * Test the retrieval of an expired ban record by an administrator.
 * 1. Create an administrator account and authenticate
 * 2. Create an expired ban record with past expiration date
 * 3. Retrieve the ban record using its ID
 * 4. Validate that ban_status is 'expired' and expires_at is in the past
 * 5. Verify all other fields are properly populated
 */
export async function test_api_admin_ban_record_retrieval_expired(
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
  // Create an expired ban record with explicit past expiration date
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "expired" as const,
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
  // Validate the ban record properties
  TestValidator.equals(
    "ban record ID matches",
    retrievedRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban duration days matches",
    retrievedRecord.ban_duration_days,
    banRecord.ban_duration_days,
  );
  TestValidator.equals(
    "ban status is expired",
    retrievedRecord.ban_status,
    "expired",
  );
  TestValidator.predicate("expires_at is in the past", () => {
    if (!retrievedRecord.expires_at) return false;
    return new Date(retrievedRecord.expires_at) < new Date();
  });
  TestValidator.equals("revoked_at is null", retrievedRecord.revoked_at, null);
  TestValidator.equals(
    "revoked_reason is null",
    retrievedRecord.revoked_reason,
    null,
  );
  TestValidator.predicate("created_at is valid", () => {
    return new Date(retrievedRecord.created_at) <= new Date();
  });
  TestValidator.predicate("updated_at is valid", () => {
    return new Date(retrievedRecord.updated_at) <= new Date();
  });
}
