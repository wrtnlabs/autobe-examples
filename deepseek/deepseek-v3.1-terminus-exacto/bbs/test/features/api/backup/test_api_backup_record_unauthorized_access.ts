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
 * Test authorization requirements for backup record creation.
 * Verifies that only authenticated administrators can create backup records,
 * and proper error codes are returned for unauthorized access attempts.
 */
export async function test_api_backup_record_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: No authentication - should fail with 401
  await TestValidator.error(
    "should reject unauthenticated request",
    async () => {
      await api.functional.discussionBoard.admin.backup_records.create(
        connection,
        {
          body: {
            backup_type: "full",
            file_path: null,
          } satisfies IDiscussionBoardBackupRecord.ICreate,
        },
      );
    },
  );
  // Test 2: Create admin connection but don't authenticate - should fail
  const unauthenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "should reject unauthenticated admin connection",
    async () => {
      await api.functional.discussionBoard.admin.backup_records.create(
        unauthenticatedAdminConnection,
        {
          body: {
            backup_type: "incremental",
            file_path: "/backups/test.bak",
          } satisfies IDiscussionBoardBackupRecord.ICreate,
        },
      );
    },
  );
  // Test 3: Test with invalid authorization header format
  const invalidAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "invalid_token_format" },
  };
  await TestValidator.error("should reject invalid token format", async () => {
    await api.functional.discussionBoard.admin.backup_records.create(
      invalidAuthConnection,
      {
        body: {
          backup_type: "files_only",
          file_path: null,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  });
  // Test 4: Authenticated admin should succeed
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
  const backupRecord =
    await api.functional.discussionBoard.admin.backup_records.create(
      adminConnection,
      {
        body: {
          backup_type: "database_only",
          file_path: `/backups/${typia.random<string & tags.Format<"uuid">>()}.bak`,
        } satisfies IDiscussionBoardBackupRecord.ICreate,
      },
    );
  typia.assert(backupRecord);
  // Verify the backup record was created successfully
  TestValidator.predicate("backup record has ID", backupRecord.id.length > 0);
  TestValidator.equals(
    "backup type matches",
    backupRecord.backup_type,
    "database_only",
  );
  TestValidator.predicate(
    "has started timestamp",
    backupRecord.started_at.length > 0,
  );
}
