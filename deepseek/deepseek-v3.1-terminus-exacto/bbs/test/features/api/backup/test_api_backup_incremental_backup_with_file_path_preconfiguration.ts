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

export async function test_api_backup_incremental_backup_with_file_path_preconfiguration(
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
  // Prepare backup data with realistic file path
  const sizeBytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const filePath = `/backups/incremental_${new Date().getTime()}.bak`;
  // Create incremental backup with file path and size preconfiguration
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "incremental" as const,
          file_path: filePath,
          size_bytes: sizeBytes,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Validate response contains all provided metadata
  TestValidator.equals("backup type", backupRecord.backup_type, "incremental");
  TestValidator.equals("file path", backupRecord.file_path, filePath);
  TestValidator.equals("size bytes", backupRecord.size_bytes, sizeBytes);
  TestValidator.equals("status", backupRecord.status, "in_progress");
  TestValidator.predicate(
    "has started timestamp",
    backupRecord.started_at !== null,
  );
  TestValidator.predicate(
    "has created timestamp",
    backupRecord.created_at !== null,
  );
  TestValidator.predicate(
    "has updated timestamp",
    backupRecord.updated_at !== null,
  );
}
