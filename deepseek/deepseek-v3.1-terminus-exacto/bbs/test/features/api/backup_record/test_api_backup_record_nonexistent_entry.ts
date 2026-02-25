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

export async function test_api_backup_record_nonexistent_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin to access the backup record endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate a random UUID that does not exist in the system
  const nonExistentId = typia.random<string>();
  // 3. Attempt to retrieve the non-existent backup record and expect a 404 error
  await TestValidator.error(
    "should return 404 for non-existent backup record",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.at(
        adminConnection,
        {
          backupRecordId: nonExistentId,
        },
      );
    },
  );
}
