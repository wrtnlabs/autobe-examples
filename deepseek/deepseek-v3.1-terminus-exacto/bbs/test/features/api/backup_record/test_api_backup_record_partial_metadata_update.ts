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

export async function test_api_backup_record_partial_metadata_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Create initial backup record with minimal information
  const initialBackupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "full",
          file_path: null, // Start with no file path
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(initialBackupRecord);
  TestValidator.equals(
    "status should be default",
    initialBackupRecord.status,
    "in_progress",
  );
  TestValidator.predicate(
    "file_path should be null",
    initialBackupRecord.file_path === null,
  );
  // 3. Update with file path and size information (should fail because status is not 'completed')
  await TestValidator.error(
    "size_bytes update should fail when status is not completed",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: initialBackupRecord.id,
          body: {
            file_path: "/backups/full_backup_2024.zip",
            size_bytes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
  // 4. Update just the file path without size_bytes (should succeed)
  const updatedFilePathRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: initialBackupRecord.id,
        body: {
          file_path: "/backups/full_backup_2024.zip",
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(updatedFilePathRecord);
  TestValidator.equals(
    "file_path should be updated",
    updatedFilePathRecord.file_path,
    "/backups/full_backup_2024.zip",
  );
  TestValidator.equals(
    "status should remain same",
    updatedFilePathRecord.status,
    "in_progress",
  );
  TestValidator.equals(
    "backup_type should be preserved",
    updatedFilePathRecord.backup_type,
    initialBackupRecord.backup_type,
  );
  // 5. Update status to 'completed' and add completion info
  const completedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: updatedFilePathRecord.id,
        body: {
          status: "completed",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000000>
          >(),
          completed_at: new Date().toISOString(),
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(completedRecord);
  TestValidator.equals(
    "status should be completed",
    completedRecord.status,
    "completed",
  );
  TestValidator.predicate(
    "size_bytes should be set",
    completedRecord.size_bytes !== null &&
      completedRecord.size_bytes !== undefined,
  );
  TestValidator.predicate(
    "completed_at should be set",
    completedRecord.completed_at !== null,
  );
  // 6. Test edge case with large file size and long path
  const largeSizeRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: completedRecord.id,
        body: {
          file_path:
            "/very/long/path/structure/that/goes/multiple/levels/deep/and/has/special_characters_-_2024_backup_final_final_v2.zip",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000000000> &
              tags.Maximum<2147483647>
          >(),
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(largeSizeRecord);
  TestValidator.predicate(
    "long file path should be accepted",
    largeSizeRecord.file_path !== null,
  );
  TestValidator.predicate(
    "large file size should be accepted",
    largeSizeRecord.size_bytes !== null &&
      largeSizeRecord.size_bytes !== undefined &&
      (largeSizeRecord.size_bytes ?? 0) > 1000000000,
  );
  // 7. Test adding error message to failed backup
  const failedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: largeSizeRecord.id,
        body: {
          status: "failed",
          error_message: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(failedRecord);
  TestValidator.equals(
    "status should be failed",
    failedRecord.status,
    "failed",
  );
  TestValidator.predicate(
    "error_message should be set",
    failedRecord.error_message !== null &&
      failedRecord.error_message !== undefined &&
      failedRecord.error_message.length > 0,
  );
  // 8. Verify that critical fields are preserved during updates
  TestValidator.equals(
    "backup_type should remain unchanged throughout all updates",
    failedRecord.backup_type,
    initialBackupRecord.backup_type,
  );
  TestValidator.equals(
    "started_at should remain unchanged throughout all updates",
    failedRecord.started_at,
    initialBackupRecord.started_at,
  );
}
