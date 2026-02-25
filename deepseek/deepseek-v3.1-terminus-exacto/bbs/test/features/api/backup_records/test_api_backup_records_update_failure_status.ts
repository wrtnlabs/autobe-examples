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

export async function test_api_backup_records_update_failure_status(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated admin connection
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
  // Create initial backup record with 'in_progress' status
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full",
          file_path: null,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Update backup record with failure status and error message
  const updateBody = {
    status: "failed",
    error_message: "Backup operation failed due to disk space exhaustion",
  } satisfies IDiscussionBoardBackupRecord.IUpdate;
  const updatedRecord =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  // Validate the update was successful
  TestValidator.equals(
    "status should be updated to 'failed'",
    updatedRecord.status,
    "failed",
  );
  TestValidator.equals(
    "error message should be stored correctly",
    updatedRecord.error_message,
    "Backup operation failed due to disk space exhaustion",
  );
  TestValidator.equals(
    "completed_at should remain null for failed operations",
    updatedRecord.completed_at,
    null,
  );
  TestValidator.equals(
    "backup type should remain unchanged",
    updatedRecord.backup_type,
    backupRecord.backup_type,
  );
  TestValidator.equals(
    "file_path should remain unchanged",
    updatedRecord.file_path,
    backupRecord.file_path,
  );
  TestValidator.equals(
    "size_bytes should remain unchanged",
    updatedRecord.size_bytes,
    backupRecord.size_bytes,
  );
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedRecord.updated_at,
    backupRecord.updated_at,
  );
}
