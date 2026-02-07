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

export async function test_api_backup_record_update_successful_completion(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial backup record (status will be set by system)
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "full" satisfies "full" as "full",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Update backup record to completed status
  const updateBody = {
    status: "completed",
    file_path: "/backups/full_backup_2024.db",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000>
    >(),
    completed_at: new Date().toISOString(),
  } satisfies IDiscussionBoardBackupRecord.IUpdate;
  const updatedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.update(
      superAdminConnection,
      {
        recordId: backupRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  // Validate the update was successful
  TestValidator.equals(
    "status updated to completed",
    updatedRecord.status,
    "completed",
  );
  TestValidator.equals(
    "file_path matches update",
    updatedRecord.file_path,
    updateBody.file_path,
  );
  TestValidator.equals(
    "size_bytes matches update",
    updatedRecord.size_bytes,
    updateBody.size_bytes,
  );
  TestValidator.predicate(
    "completed_at is set",
    updatedRecord.completed_at !== null,
  );
  TestValidator.predicate(
    "completed_at is valid date string",
    typeof updatedRecord.completed_at === "string" &&
      updatedRecord.completed_at.length > 0,
  );
  // Verify other fields remain consistent
  TestValidator.equals(
    "id remains unchanged",
    updatedRecord.id,
    backupRecord.id,
  );
  TestValidator.equals(
    "backup_type remains unchanged",
    updatedRecord.backup_type,
    backupRecord.backup_type,
  );
  TestValidator.equals(
    "started_at remains unchanged",
    updatedRecord.started_at,
    backupRecord.started_at,
  );
}
