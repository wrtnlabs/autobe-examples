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

export async function test_api_backup_record_cross_admin_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first superAdmin account to own the backup record
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
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
  typia.assert(firstSuperAdmin);
  // 2. Create backup record owned by first superAdmin
  const backupRecord =
    await generate_random_discussion_board_super_admin_backup_records_create(
      firstSuperAdminConnection,
      {
        body: {
          backup_type: "full",
          file_path: "/backups/full_backup_2024.db",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // 3. Create second superAdmin account to attempt unauthorized deletion
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
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
  typia.assert(secondSuperAdmin);
  // 4. Attempt to delete the backup record using second superAdmin's credentials
  await TestValidator.httpError(
    "unauthorized deletion attempt",
    403,
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.erase(
        secondSuperAdminConnection,
        {
          backupRecordId: backupRecord.id,
        },
      );
    },
  );
  // 5. Verify the backup record still exists by attempting deletion with correct owner
  await api.functional.discussionBoard.superAdmin.backup_records.erase(
    firstSuperAdminConnection,
    {
      backupRecordId: backupRecord.id,
    },
  );
}
