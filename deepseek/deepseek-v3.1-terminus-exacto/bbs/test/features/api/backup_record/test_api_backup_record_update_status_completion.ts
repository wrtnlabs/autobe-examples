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
 * Test updating a backup record from 'in_progress' to 'completed' status.
 * 1. Authenticate as administrator
 * 2. Create initial backup record (automatically gets 'in_progress' status)
 * 3. Update record to 'completed' status with file details
 * 4. Validate status transition and timestamp updates
 */
export async function test_api_backup_record_update_status_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
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
  // 2. Create initial backup record (status automatically set to 'in_progress')
  const backupTypes = [
    "full",
    "incremental",
    "database_only",
    "files_only",
  ] as const;
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: RandomGenerator.pick(backupTypes),
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate initial status is 'in_progress'
  TestValidator.equals(
    "initial status should be in_progress",
    backupRecord.status,
    "in_progress",
  );
  // 3. Update backup record to 'completed' status
  const updateData: IDiscussionBoardBackupRecord.IUpdate = {
    status: "completed",
    file_path: `/backups/${backupRecord.id}.tar.gz`,
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000>
    >(),
    completed_at: new Date().toISOString(),
  };
  const updatedRecord =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        recordId: backupRecord.id,
        body: updateData,
      },
    );
  typia.assert(updatedRecord);
  // 4. Validate the update (typia.assert already validates all properties)
  TestValidator.equals(
    "status should be updated to completed",
    updatedRecord.status,
    "completed",
  );
  TestValidator.equals(
    "file path should be set",
    updatedRecord.file_path,
    updateData.file_path,
  );
  TestValidator.equals(
    "size bytes should be set",
    updatedRecord.size_bytes,
    updateData.size_bytes,
  );
  TestValidator.predicate(
    "completed_at should be set",
    updatedRecord.completed_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedRecord.updated_at) > new Date(backupRecord.created_at),
  );
}
