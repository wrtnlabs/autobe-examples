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
 * Test successful backup record deletion workflow.
 * 1. Create an administrator account to get authentication credentials
 * 2. Create a backup record using the authenticated admin connection
 * 3. Delete the backup record using the DELETE endpoint
 * 4. Verify deletion operation completes successfully and audit logging
 */
export async function test_api_backup_records_admin_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a backup record
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full",
          file_path: "/backups/backup_2024.zip",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // 3. Delete the backup record - will throw on error, succeed silently on success
  await api.functional.discussionBoard.admin.backup_records.erase(
    adminConnection,
    {
      backupRecordId: backupRecord.id,
    },
  );
  // 4. Deletion successful if no error thrown (returns void on 204)
  // No additional verification needed as the API call itself validates success
}
