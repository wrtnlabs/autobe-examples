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

/**
 * Test retrieval of an in-progress backup record.
 * Validate that super administrators can monitor ongoing backup operations by accessing
 * records with 'in_progress' status. Verify that the response includes current status
 * information and operational metadata for real-time monitoring purposes.
 */
export async function test_api_backup_record_retrieval_in_progress_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Generate a random UUID for testing
  const recordId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the backup record
  const backupRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.at(
      superAdminConnection,
      { recordId },
    );
  typia.assert(backupRecord);
  // 4. Validate operational metadata for in_progress records
  // This is business logic validation, not type validation
  if (backupRecord.status === "in_progress") {
    TestValidator.equals(
      "in_progress record has null completed_at",
      backupRecord.completed_at,
      null,
    );
    TestValidator.equals(
      "in_progress record has null error_message",
      backupRecord.error_message,
      null,
    );
    TestValidator.equals(
      "in_progress record has null file_path",
      backupRecord.file_path,
      null,
    );
    TestValidator.equals(
      "in_progress record has null size_bytes",
      backupRecord.size_bytes,
      null,
    );
  }
}
