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
 * Test edge cases for backup record updates including partial updates,
 * nonexistent records, unauthorized access attempts, and logical constraints.
 */
export async function test_api_backup_records_update_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create initial backup record for testing using SDK directly
  const backupRecord =
    await api.functional.discussionBoard.admin.backup_records.create(
      adminConnection,
      {
        body: {
          backup_type: "full",
          file_path: null,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Test 1: Partial update with only status field
  const partialStatusUpdate =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          status: "completed",
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(partialStatusUpdate);
  TestValidator.equals(
    "status updated",
    partialStatusUpdate.status,
    "completed",
  );
  TestValidator.notEquals(
    "only status changed",
    partialStatusUpdate.file_path,
    backupRecord.file_path,
  );
  // Test 2: Partial update with file path and size
  const partialFileUpdate =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          file_path: "/backups/backup_2024.db",
          size_bytes: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(partialFileUpdate);
  TestValidator.equals(
    "file path updated",
    partialFileUpdate.file_path,
    "/backups/backup_2024.db",
  );
  TestValidator.predicate(
    "size bytes positive",
    (partialFileUpdate.size_bytes ?? 0) > 0,
  );
  // Test 3: Update with completed timestamp
  const completedUpdate =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          completed_at: new Date().toISOString(),
          error_message: undefined,
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(completedUpdate);
  TestValidator.predicate(
    "completed at set",
    completedUpdate.completed_at !== null,
  );
  // Test 4: Update with error message and failed status
  const errorUpdate =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          status: "failed",
          error_message: "Backup operation timed out",
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(errorUpdate);
  TestValidator.equals("status set to failed", errorUpdate.status, "failed");
  TestValidator.equals(
    "error message set",
    errorUpdate.error_message,
    "Backup operation timed out",
  );
  // Test 5: Attempt to update non-existent backup record (should return 404)
  await TestValidator.httpError(
    "non-existent record returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.backup_records.update(
        adminConnection,
        {
          backupRecordId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "completed",
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // Test 6: Test unauthorized access (non-admin connection)
  const regularConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () => {
      await api.functional.discussionBoard.admin.backup_records.update(
        regularConnection,
        {
          backupRecordId: backupRecord.id,
          body: {
            status: "completed",
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // Test 7: Test complete update with all fields
  const completeUpdate =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          status: "completed",
          file_path: "/backups/final_backup.db",
          size_bytes: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<5000>
          >(),
          completed_at: new Date().toISOString(),
          error_message: undefined,
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(completeUpdate);
  TestValidator.equals(
    "complete update status",
    completeUpdate.status,
    "completed",
  );
  TestValidator.equals(
    "complete update file path",
    completeUpdate.file_path,
    "/backups/final_backup.db",
  );
  TestValidator.predicate(
    "complete update size valid",
    (completeUpdate.size_bytes ?? 0) > 0,
  );
}