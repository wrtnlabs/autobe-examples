import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
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

export async function test_api_backup_record_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Create initial backup record with specific status
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "full" as const,
          file_path: "/backups/test_backup.tar.gz",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Store original values for comparison
  const originalStatus = backupRecord.status;
  const originalBackupType = backupRecord.backup_type;
  const originalFilePath = backupRecord.file_path;
  const originalSizeBytes = backupRecord.size_bytes;
  const originalCreatedAt = backupRecord.created_at;
  const originalUpdatedAt = backupRecord.updated_at;
  const originalInitiatedByAdmin = backupRecord.initiatedByAdmin;
  // 3. Update only the error_message field
  const updatedBackupRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        recordId: backupRecord.id,
        body: {
          error_message:
            "Disk I/O error: insufficient space on backup volume /dev/sdb1",
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(updatedBackupRecord);
  // 4. Validate partial update behavior
  TestValidator.equals(
    "error_message should be updated",
    updatedBackupRecord.error_message,
    "Disk I/O error: insufficient space on backup volume /dev/sdb1",
  );
  TestValidator.equals(
    "status should remain unchanged",
    updatedBackupRecord.status,
    originalStatus,
  );
  TestValidator.equals(
    "backup_type should remain unchanged",
    updatedBackupRecord.backup_type,
    originalBackupType,
  );
  TestValidator.equals(
    "file_path should remain unchanged",
    updatedBackupRecord.file_path,
    originalFilePath,
  );
  TestValidator.equals(
    "size_bytes should remain unchanged",
    updatedBackupRecord.size_bytes,
    originalSizeBytes,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedBackupRecord.id,
    backupRecord.id,
  );
  TestValidator.equals(
    "started_at should remain unchanged",
    updatedBackupRecord.started_at,
    backupRecord.started_at,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBackupRecord.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "initiatedByAdmin should remain unchanged",
    updatedBackupRecord.initiatedByAdmin,
    originalInitiatedByAdmin,
  );
  // Validate updated_at timestamp is newer
  TestValidator.predicate(
    "updated_at should be newer than original updated_at",
    new Date(updatedBackupRecord.updated_at) > new Date(originalUpdatedAt),
  );
}
