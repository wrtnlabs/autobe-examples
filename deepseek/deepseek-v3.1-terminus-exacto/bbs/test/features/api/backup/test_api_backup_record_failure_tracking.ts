import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_backup_records_create } from "../../../generate/generate_random_discussion_board_super_admin_backup_records_create";
import { prepare_random_discussion_board_backup_record } from "../../../prepare/prepare_random_discussion_board_backup_record";

export async function test_api_backup_record_failure_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(auth);
  // Step 2: Create a backup record with initial status 'in_progress'
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: RandomGenerator.pick([
            "full",
            "incremental",
            "database_only",
            "files_only",
          ] as const),
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  TestValidator.equals(
    "initial status is in_progress",
    backupRecord.status,
    "in_progress",
  );
  // Step 3: Attempt to update to failed status without error_message (should fail)
  await TestValidator.error(
    "failed status requires error_message",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: backupRecord.id,
          body: {
            status: "failed",
            completed_at: new Date().toISOString(),
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // Step 4: Update backup record to failed status with valid error_message
  const longErrorMessage = RandomGenerator.paragraph({ sentences: 5 });
  const completedAt = new Date().toISOString();
  const updatedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          status: "failed",
          error_message: longErrorMessage,
          completed_at: completedAt,
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(updatedRecord);
  // Step 5: Validate the update was successful
  TestValidator.equals(
    "status updated to failed",
    updatedRecord.status,
    "failed",
  );
  TestValidator.equals(
    "error_message saved correctly",
    updatedRecord.error_message,
    longErrorMessage,
  );
  TestValidator.equals(
    "completed_at saved correctly",
    updatedRecord.completed_at,
    completedAt,
  );
  TestValidator.predicate(
    "file_path should be null for failed backup",
    updatedRecord.file_path === null || updatedRecord.file_path === undefined,
  );
  TestValidator.predicate(
    "size_bytes should be null for failed backup",
    updatedRecord.size_bytes === null || updatedRecord.size_bytes === undefined,
  );
  // Step 6: Attempt to provide file_path for failed backup (should fail)
  await TestValidator.error("failed backup cannot have file_path", async () => {
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: backupRecord.id,
        body: {
          file_path: "/backups/failed_backup.tar.gz",
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  });
  // Step 7: Attempt to provide size_bytes for failed backup (should fail)
  await TestValidator.error(
    "failed backup cannot have size_bytes",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: backupRecord.id,
          body: {
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // Step 8: Attempt to revert status from failed to in_progress (should fail)
  await TestValidator.error(
    "cannot revert from failed to in_progress",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: backupRecord.id,
          body: {
            status: "in_progress",
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // Step 9: Validate business rule - error_message only allowed when status is 'failed'
  // Create another backup record to test this rule
  const secondBackup =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: RandomGenerator.pick([
            "full",
            "incremental",
            "database_only",
            "files_only",
          ] as const),
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(secondBackup);
  await TestValidator.error(
    "error_message not allowed for in_progress status",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: secondBackup.id,
          body: {
            error_message: "some error",
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
}
