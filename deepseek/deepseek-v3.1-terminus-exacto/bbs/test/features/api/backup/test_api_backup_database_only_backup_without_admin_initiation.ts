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
 * Test creation of a database-only backup without specifying an initiating administrator.
 * Validate that the backup record is created successfully with status 'in_progress' and
 * backup_type 'database_only'. Verify that initiated_by_admin_id is null when not provided,
 * indicating an automated or system-initiated backup. Ensure all required fields are
 * populated and optional fields are handled correctly when omitted.
 */
export async function test_api_backup_database_only_backup_without_admin_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create database-only backup without admin initiation
  const backupRecord =
    await api.functional.discussionBoard.admin.backup_records.create(
      adminConnection,
      {
        body: {
          backup_type: "database_only",
          initiated_by_admin_id: null,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate backup record properties
  TestValidator.equals(
    "backup type",
    backupRecord.backup_type,
    "database_only",
  );
  TestValidator.equals("backup status", backupRecord.status, "in_progress");
  TestValidator.equals(
    "initiated by admin",
    backupRecord.initiatedByAdmin,
    null,
  );
  TestValidator.predicate(
    "has started_at timestamp",
    !!backupRecord.started_at,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    !!backupRecord.created_at,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    !!backupRecord.updated_at,
  );
}
