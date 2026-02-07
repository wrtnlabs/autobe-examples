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

export async function test_api_backup_record_retrieval_successful_completed(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create authenticated connection with the token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedSuperAdmin.token.access },
  };
  // Retrieve a backup record
  const backupRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.at(
      authenticatedConnection,
      {
        recordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(backupRecord);
  // Validate business logic - backup record should be completed and not deleted
  TestValidator.predicate(
    "backup record is not soft-deleted",
    backupRecord.deleted_at === null,
  );
  TestValidator.equals(
    "backup record has completed status",
    backupRecord.status,
    "completed",
  );
  // Validate that completed backup has required metadata
  TestValidator.predicate(
    "completed backup has file path",
    backupRecord.file_path !== null && backupRecord.file_path !== undefined,
  );
  TestValidator.predicate(
    "completed backup has size information",
    backupRecord.size_bytes !== null && backupRecord.size_bytes !== undefined,
  );
  TestValidator.predicate(
    "completed backup has completion timestamp",
    backupRecord.completed_at !== null &&
      backupRecord.completed_at !== undefined,
  );
}
