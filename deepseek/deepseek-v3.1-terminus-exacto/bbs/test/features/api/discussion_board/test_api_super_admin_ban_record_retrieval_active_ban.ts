import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test the successful retrieval of an active ban record by a super administrator.
 * This scenario validates that super administrators can access detailed ban information
 * including ban reason, duration, status, and expiration details.
 */
export async function test_api_super_admin_ban_record_retrieval_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create an active ban record with guaranteed non-empty ban reason
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Retrieve the ban record
  const retrievedBanRecord =
    await api.functional.discussionBoard.superAdmin.ban_records.at(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // Validate all fields match
  TestValidator.equals("ban record ID", retrievedBanRecord.id, banRecord.id);
  TestValidator.equals(
    "ban reason",
    retrievedBanRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban duration days",
    retrievedBanRecord.ban_duration_days,
    banRecord.ban_duration_days,
  );
  TestValidator.equals("ban status", retrievedBanRecord.ban_status, "active");
  TestValidator.equals(
    "revoked_at is null",
    retrievedBanRecord.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoked_reason is null",
    retrievedBanRecord.revoked_reason,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedBanRecord.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedBanRecord.updated_at !== null,
  );
  // Validate expires_at is calculated correctly for active ban
  if (banRecord.ban_duration_days !== null) {
    TestValidator.predicate(
      "expires_at exists for temporary ban",
      retrievedBanRecord.expires_at !== null,
    );
  }
}
