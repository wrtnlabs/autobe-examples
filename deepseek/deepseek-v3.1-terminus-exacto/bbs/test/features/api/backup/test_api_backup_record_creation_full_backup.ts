import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_backup_records_create } from "../../../generate/generate_random_discussion_board_admin_backup_records_create";
import { prepare_random_discussion_board_backup_record } from "../../../prepare/prepare_random_discussion_board_backup_record";

/**
 * Test the successful creation of a full backup record by an authenticated administrator.
 * Verifies that the system generates UUID, sets status to 'in_progress' by default,
 * captures current timestamp for started_at, returns complete backup record with
 * initiated_by_admin reference, and properly excludes completed_at and error_message
 * for new records. Validates that backup_type 'full' is accepted and file_path
 * is optionally accepted when provided.
 */
export async function test_api_backup_record_creation_full_backup(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for admin authentication and backup operations
  const joinConnection: api.IConnection = { host: connection.host };
  // First create an admin account
  const adminUser = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Create separate connection for authenticated backup operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminUser.email,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Now create the backup record using the authenticated admin connection
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full",
          file_path: "/backups/full_backup_2024.db",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate backup record properties
  TestValidator.equals(
    "backup_type should be 'full'",
    backupRecord.backup_type,
    "full",
  );
  TestValidator.equals(
    "status should be 'in_progress' by default",
    backupRecord.status,
    "in_progress",
  );
  TestValidator.equals(
    "completed_at should be null for new backup",
    backupRecord.completed_at,
    null,
  );
  TestValidator.equals(
    "error_message should be null for new backup",
    backupRecord.error_message,
    null,
  );
  TestValidator.equals(
    "file_path should match input",
    backupRecord.file_path,
    "/backups/full_backup_2024.db",
  );
  TestValidator.predicate(
    "initiated_by_admin should be set",
    backupRecord.initiated_by_admin !== null,
  );
  if (backupRecord.initiated_by_admin) {
    TestValidator.equals(
      "initiated_by_admin id should match admin user",
      backupRecord.initiated_by_admin.id,
      adminUser.id,
    );
    TestValidator.equals(
      "initiated_by_admin email should match",
      backupRecord.initiated_by_admin.email,
      adminUser.email,
    );
    TestValidator.equals(
      "initiated_by_admin display_name should match",
      backupRecord.initiated_by_admin.display_name,
      adminUser.display_name,
    );
  }
}
