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
 * Test the creation of a full system backup initiated by an administrator.
 * 1. Create an administrator account
 * 2. Initiate a full system backup
 * 3. Validate backup record creation with correct status and administrator reference
 */
export async function test_api_backup_full_system_backup_with_admin_initiation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as administrator
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
  // Create full system backup using utility function
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full" as const,
          initiated_by_admin_id: admin.id,
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
  TestValidator.predicate(
    "status should be set",
    backupRecord.status !== null && backupRecord.status !== undefined,
  );
  TestValidator.predicate(
    "initiated_by_admin_id should match admin id",
    backupRecord.initiatedByAdmin?.id === admin.id,
  );
  TestValidator.predicate(
    "started_at should be set",
    backupRecord.started_at !== null && backupRecord.started_at !== undefined,
  );
  TestValidator.predicate(
    "created_at should be set",
    backupRecord.created_at !== null && backupRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    backupRecord.updated_at !== null && backupRecord.updated_at !== undefined,
  );
}
