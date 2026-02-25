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

export async function test_api_backup_record_superadmin_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a backup record to delete
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
          file_path: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Delete the backup record
  await api.functional.discussionBoard.superAdmin.backup_records.erase(
    superAdminConnection,
    {
      backupRecordId: backupRecord.id,
    },
  );
  // Verify deletion by attempting to access the deleted record should return 404
  await TestValidator.httpError(
    "backup record should return 404 after deletion",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.erase(
        superAdminConnection,
        {
          backupRecordId: backupRecord.id,
        },
      );
    },
  );
}
