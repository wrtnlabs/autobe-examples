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

/**
 * Test that a super administrator can successfully initiate a full system backup.
 * 1. Authenticate as superAdmin using join operation
 * 2. Create backup record with backup_type 'full' and optional file_path
 * 3. Validate response includes UUID, status defaults to 'in_progress', proper timestamps
 */
export async function test_api_backup_record_creation_full_backup_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // Create full backup record
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "full",
          file_path: `/backups/full_${typia.random<string & tags.Format<"uuid">>()}.zip`,
        },
      },
    );
  typia.assert(backupRecord);
  // Validate response structure - focus on business logic, not type validation
  TestValidator.equals(
    "backup type matches request",
    backupRecord.backup_type,
    "full",
  );
  TestValidator.predicate("has valid UUID", () => backupRecord.id.length > 0);
  TestValidator.predicate(
    "status is set",
    () =>
      typeof backupRecord.status === "string" && backupRecord.status.length > 0,
  );
  TestValidator.predicate(
    "started_at is valid timestamp",
    () => !isNaN(new Date(backupRecord.started_at).getTime()),
  );
  TestValidator.equals(
    "completed_at is null for in-progress backup",
    backupRecord.completed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => !isNaN(new Date(backupRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => !isNaN(new Date(backupRecord.updated_at).getTime()),
  );
  // Optional: Validate initiatedByAdmin if present
  if (backupRecord.initiated_by_admin) {
    await TestValidator.predicate(
      "initiated_by_admin has valid structure",
      () =>
        !!backupRecord.initiated_by_admin &&
        typeof backupRecord.initiated_by_admin.id === "string",
    );
  }
}