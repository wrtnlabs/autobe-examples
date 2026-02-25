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

export async function test_api_backup_records_update_completion(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
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
  const backupRecord =
    await generate_random_discussion_board_admin_backup_records_create(
      adminConnection,
      {
        body: {
          backup_type: "full",
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  TestValidator.equals("initial status", backupRecord.status, "in_progress");
  TestValidator.predicate(
    "completed_at is null",
    backupRecord.completed_at === null,
  );
  const updateBody = {
    status: "completed",
    file_path: "/backups/2024/backup_full.tar.gz",
    size_bytes: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    completed_at: new Date().toISOString(),
  } satisfies IDiscussionBoardBackupRecord.IUpdate;
  const updatedRecord =
    await api.functional.discussionBoard.admin.backup_records.update(
      adminConnection,
      {
        backupRecordId: backupRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRecord);
  TestValidator.equals("status updated", updatedRecord.status, "completed");
  TestValidator.equals(
    "file_path matches",
    updatedRecord.file_path,
    updateBody.file_path,
  );
  TestValidator.equals(
    "size_bytes matches",
    updatedRecord.size_bytes,
    updateBody.size_bytes,
  );
  TestValidator.equals(
    "completed_at matches",
    updatedRecord.completed_at,
    updateBody.completed_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    backupRecord.updated_at,
    updatedRecord.updated_at,
  );
  TestValidator.equals("id unchanged", updatedRecord.id, backupRecord.id);
  TestValidator.equals(
    "backup_type unchanged",
    updatedRecord.backup_type,
    backupRecord.backup_type,
  );
  TestValidator.equals(
    "started_at unchanged",
    updatedRecord.started_at,
    backupRecord.started_at,
  );
}
