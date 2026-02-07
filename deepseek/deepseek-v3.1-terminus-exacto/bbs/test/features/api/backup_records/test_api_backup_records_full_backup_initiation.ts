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

/**
 * Test the creation of a full system backup by a super administrator.
 * Validates that a full backup record is created with status 'in_progress',
 * started_at timestamp is set correctly, and the backup type is properly recorded.
 */
export async function test_api_backup_records_full_backup_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Initiate full backup using utility function
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      superAdminConnection,
      {
        body: {
          backup_type: "full" as const,
          initiated_by_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate backup record properties
  TestValidator.equals(
    "backup type should be 'full'",
    backupRecord.backup_type,
    "full",
  );
  TestValidator.equals(
    "status should be 'in_progress'",
    backupRecord.status,
    "in_progress",
  );
  TestValidator.equals(
    "initiatedByAdmin.id should match super admin id",
    backupRecord.initiatedByAdmin!.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "started_at should be valid ISO string",
    () => !isNaN(new Date(backupRecord.started_at).getTime()),
  );
  TestValidator.predicate(
    "created_at should be valid ISO string",
    () => !isNaN(new Date(backupRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO string",
    () => !isNaN(new Date(backupRecord.updated_at).getTime()),
  );
  TestValidator.predicate("id should be valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      backupRecord.id,
    ),
  );
}
