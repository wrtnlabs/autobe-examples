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

export async function test_api_backup_record_completion_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create initial backup record in 'in_progress' status
  const backupTypes = [
    "full",
    "incremental",
    "database_only",
    "files_only",
  ] as const;
  const backupType = RandomGenerator.pick(backupTypes);
  const createBody = {
    backup_type: backupType,
    file_path: null,
  } satisfies IDiscussionBoardBackupRecord.ICreate;
  const initialRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(initialRecord);
  // Validate initial state
  TestValidator.equals(
    "initial status is in_progress",
    initialRecord.status,
    "in_progress",
  );
  TestValidator.predicate(
    "initial completed_at is null",
    initialRecord.completed_at === null,
  );
  TestValidator.predicate(
    "initial size_bytes is null",
    initialRecord.size_bytes === null,
  );
  TestValidator.predicate(
    "file_path is null",
    initialRecord.file_path === null,
  );
  TestValidator.equals(
    "backup_type matches",
    initialRecord.backup_type,
    backupType,
  );
  // 3. Update backup record to 'completed' status with valid file information
  const startedAt = new Date(initialRecord.started_at);
  const completedAt = new Date(startedAt.getTime() + 60000); // 1 minute later
  const updateBody = {
    status: "completed",
    file_path: `/backups/${backupType}_${completedAt.toISOString().replace(/[:.]/g, "-")}.bak`,
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    completed_at: completedAt.toISOString(),
  } satisfies IDiscussionBoardBackupRecord.IUpdate;
  const updatedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: initialRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  // 4. Validate all business rules
  TestValidator.equals(
    "status updated to completed",
    updatedRecord.status,
    "completed",
  );
  TestValidator.equals(
    "file_path updated",
    updatedRecord.file_path,
    updateBody.file_path,
  );
  TestValidator.equals(
    "size_bytes updated",
    updatedRecord.size_bytes,
    updateBody.size_bytes,
  );
  TestValidator.equals(
    "completed_at updated",
    updatedRecord.completed_at,
    updateBody.completed_at,
  );
  TestValidator.predicate(
    "size_bytes is positive",
    updatedRecord.size_bytes! > 0,
  );
  const actualCompletedAt = new Date(updatedRecord.completed_at!);
  TestValidator.predicate(
    "completed_at after started_at",
    actualCompletedAt > startedAt,
  );
  TestValidator.predicate(
    "file_path contains backup type",
    updatedRecord.file_path!.includes(backupType),
  );
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedRecord.updated_at) > new Date(initialRecord.updated_at),
  );
  TestValidator.equals(
    "backup_type unchanged",
    updatedRecord.backup_type,
    initialRecord.backup_type,
  );
  // 5. Test partial update functionality (update only file_path)
  const newFilePath = `/backups/${backupType}_${Date.now()}.bak`;
  const partialUpdateBody = {
    file_path: newFilePath,
  } satisfies IDiscussionBoardBackupRecord.IUpdate;
  const partiallyUpdatedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        backupRecordId: initialRecord.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdatedRecord);
  TestValidator.equals(
    "partial update retains status",
    partiallyUpdatedRecord.status,
    "completed",
  );
  TestValidator.equals(
    "partial update changes file_path",
    partiallyUpdatedRecord.file_path,
    newFilePath,
  );
  TestValidator.equals(
    "partial update retains size_bytes",
    partiallyUpdatedRecord.size_bytes,
    updatedRecord.size_bytes,
  );
  TestValidator.equals(
    "partial update retains completed_at",
    partiallyUpdatedRecord.completed_at,
    updatedRecord.completed_at,
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    new Date(partiallyUpdatedRecord.updated_at) >
      new Date(updatedRecord.updated_at),
  );
  // 6. Test invalid status transition error (trying to revert to 'in_progress')
  await TestValidator.error(
    "cannot revert status from completed to in_progress",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.update(
        superAdminConnection,
        {
          backupRecordId: initialRecord.id,
          body: {
            status: "in_progress",
          } satisfies IDiscussionBoardBackupRecord.IUpdate,
        },
      );
    },
  );
}
