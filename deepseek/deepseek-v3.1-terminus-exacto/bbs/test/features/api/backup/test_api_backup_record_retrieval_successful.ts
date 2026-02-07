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

export async function test_api_backup_record_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Since there's no backup creation endpoint available, we need to test with a valid record ID
  // that might exist in the system. We'll use typia.random to generate a valid UUID format.
  const backupRecordId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the backup record
  const retrievedRecord =
    await api.functional.discussionBoard.admin.backup_records.at(
      adminConnection,
      { recordId: backupRecordId },
    );
  typia.assert(retrievedRecord);
  // Validate business logic - the retrieved record should match the requested ID
  TestValidator.equals(
    "record ID matches requested ID",
    retrievedRecord.id,
    backupRecordId,
  );
  // Validate that soft-deleted records are excluded (deleted_at should be null for active records)
  TestValidator.equals(
    "record is not soft-deleted",
    retrievedRecord.deleted_at,
    null,
  );
  // Validate that the record has valid timestamps (business logic validation)
  TestValidator.predicate(
    "started_at is before or equal to current time",
    new Date(retrievedRecord.started_at) <= new Date(),
  );
  TestValidator.predicate(
    "created_at is before or equal to current time",
    new Date(retrievedRecord.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(retrievedRecord.updated_at) >=
      new Date(retrievedRecord.created_at),
  );
  // If completed_at exists, it should be after started_at
  if (
    retrievedRecord.completed_at !== null &&
    retrievedRecord.completed_at !== undefined
  ) {
    TestValidator.predicate(
      "completed_at is after started_at",
      new Date(retrievedRecord.completed_at) >=
        new Date(retrievedRecord.started_at),
    );
  }
  // Validate administrator relationship when present
  if (
    retrievedRecord.initiatedByAdmin !== null &&
    retrievedRecord.initiatedByAdmin !== undefined
  ) {
    TestValidator.predicate(
      "admin has valid email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedRecord.initiatedByAdmin.email),
    );
    TestValidator.predicate(
      "admin has display name",
      retrievedRecord.initiatedByAdmin.display_name.length > 0,
    );
  }
}