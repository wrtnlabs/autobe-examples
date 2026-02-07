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
 * Test updating a backup record from 'in_progress' to 'failed' status with error message.
 * 1. Authenticate as administrator
 * 2. Create initial backup record in 'in_progress' state
 * 3. Update backup record to 'failed' status with error message
 * 4. Verify status transition, error message storage, and completion timestamp
 */
export async function test_api_backup_record_update_status_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial backup record in 'in_progress' state
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full" as const,
          initiated_by_admin_id: adminAuth.id,
          file_path: null,
          size_bytes: null,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate initial state is 'in_progress'
  TestValidator.equals(
    "initial status should be in_progress",
    backupRecord.status,
    "in_progress",
  );
  // 3. Update backup record to 'failed' status with error message
  const errorMessage = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRecord =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        recordId: backupRecord.id,
        body: {
          status: "failed",
          error_message: errorMessage,
          completed_at: typia.random<string & tags.Format<"date-time">>(),
        } satisfies IDiscussionBoardBackupRecord.IUpdate,
      },
    );
  typia.assert(updatedRecord);
  // 4. Validate the update
  TestValidator.equals(
    "status should transition to failed",
    updatedRecord.status,
    "failed",
  );
  TestValidator.equals(
    "error message should be stored",
    updatedRecord.error_message,
    errorMessage,
  );
  TestValidator.predicate(
    "completed_at should be set",
    updatedRecord.completed_at !== null,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedRecord.id,
    backupRecord.id,
  );
  TestValidator.equals(
    "backup_type should remain unchanged",
    updatedRecord.backup_type,
    backupRecord.backup_type,
  );
  TestValidator.equals(
    "started_at should remain unchanged",
    updatedRecord.started_at,
    backupRecord.started_at,
  );
  TestValidator.equals(
    "initiatedByAdmin should remain unchanged",
    updatedRecord.initiatedByAdmin?.id,
    backupRecord.initiatedByAdmin?.id,
  );
}
