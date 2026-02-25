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

export async function test_api_backup_record_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Create backup record
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
          file_path: `/backups/${RandomGenerator.alphaNumeric(10)}.db`,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Retrieve the backup record
  const retrievedRecord =
    await api.functional.discussionBoard.superAdmin.backup_records.at(
      superAdminConnection,
      {
        backupRecordId: backupRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Validate retrieved data matches created data
  TestValidator.equals("backup record ID", retrievedRecord.id, backupRecord.id);
  TestValidator.equals(
    "backup type",
    retrievedRecord.backup_type,
    backupRecord.backup_type,
  );
  TestValidator.equals(
    "file path",
    retrievedRecord.file_path,
    backupRecord.file_path,
  );
  TestValidator.predicate(
    "has valid backup type",
    ["full", "incremental", "database_only", "files_only"].includes(
      retrievedRecord.backup_type,
    ),
  );
  TestValidator.predicate(
    "has status field",
    retrievedRecord.status !== undefined,
  );
  TestValidator.predicate(
    "has started_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRecord.started_at),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRecord.created_at),
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRecord.updated_at),
  );
}
