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

export async function test_api_backup_record_creation_database_only_with_file_path(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // Create backup record using utility function
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "database_only",
          file_path: "/backups/db/2025-02-24.sql",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate response
  TestValidator.equals(
    "backup_type matches",
    backupRecord.backup_type,
    "database_only",
  );
  TestValidator.equals(
    "file_path matches",
    backupRecord.file_path,
    "/backups/db/2025-02-24.sql",
  );
  TestValidator.equals(
    "status is in_progress",
    backupRecord.status,
    "in_progress",
  );
  TestValidator.predicate(
    "size_bytes is null for non-completed backup",
    backupRecord.size_bytes === null,
  );
  TestValidator.predicate(
    "started_at is valid date",
    new Date(backupRecord.started_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "completed_at is null",
    backupRecord.completed_at === null,
  );
  TestValidator.predicate(
    "error_message is null",
    backupRecord.error_message === null,
  );
  // Validate initiated_by_admin with proper null checking
  if (
    backupRecord.initiated_by_admin !== null &&
    backupRecord.initiated_by_admin !== undefined
  ) {
    TestValidator.equals(
      "initiated_by_admin id matches",
      backupRecord.initiated_by_admin.id,
      authorizedSuperAdmin.admin!.id,
    );
  } else {
    throw new Error("initiated_by_admin should not be null");
  }
}
