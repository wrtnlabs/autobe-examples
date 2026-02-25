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

export async function test_api_backup_records_admin_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin connection and create backup record
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin1);
  // Create backup record with first admin
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      admin1Connection,
      {
        body: {
          backup_type: "full",
          file_path: "/backups/test_backup.tar.gz",
        },
      },
    );
  typia.assert(backupRecord);
  // Create second admin connection
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  // Attempt to delete the record with second admin (should fail)
  await TestValidator.error(
    "unauthorized admin cannot delete backup record",
    async () => {
      await api.functional.discussionBoard.admin.backup_records.erase(
        admin2Connection,
        {
          backupRecordId: backupRecord.id,
        },
      );
    },
  );
  // Verify record still exists by successfully deleting it with the original admin
  await api.functional.discussionBoard.admin.backup_records.erase(
    admin1Connection,
    {
      backupRecordId: backupRecord.id,
    },
  );
}
