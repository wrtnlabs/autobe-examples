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
 * Test the retrieval of an active ban record by an administrator.
 * 1. Create an administrator account and authenticate
 * 2. Create an active ban record with reasonable duration
 * 3. Retrieve the ban record using the returned banRecordId
 * 4. Validate all ban record fields including expiration calculation
 */
export async function test_api_admin_ban_record_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
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
  // 2. Create an active ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Retrieve the ban record
  const retrievedRecord =
    await api.functional.discussionBoard.admin.ban_records.at(adminConnection, {
      banRecordId: banRecord.id,
    });
  typia.assert(retrievedRecord);
  // 4. Validate all ban record fields
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
    "ban duration matches",
    retrievedRecord.ban_duration_days,
    banRecord.ban_duration_days,
  );
  TestValidator.equals(
    "ban status is active",
    retrievedRecord.ban_status,
    "active",
  );
  // Validate expiration calculation
  if (
    retrievedRecord.ban_duration_days !== null &&
    retrievedRecord.ban_duration_days !== undefined
  ) {
    const createdDate = new Date(retrievedRecord.created_at);
    const expiresDate = new Date(retrievedRecord.expires_at!);
    const expectedExpiresDate = new Date(
      createdDate.getTime() +
        retrievedRecord.ban_duration_days * 24 * 60 * 60 * 1000,
    );
    TestValidator.predicate(
      "expires_at is calculated correctly",
      Math.abs(expiresDate.getTime() - expectedExpiresDate.getTime()) < 1000,
    ); // Allow 1 second tolerance
  }
}
