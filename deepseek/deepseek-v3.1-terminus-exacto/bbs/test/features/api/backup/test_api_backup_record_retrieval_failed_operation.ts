import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
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

/**
 * Test retrieval of a failed backup operation record.
 * Since backup records are system-generated and there's no API to create them,
 * this test validates the error handling when attempting to retrieve a non-existent
 * backup record. This ensures proper error responses for invalid backup record IDs.
 */
export async function test_api_backup_record_retrieval_failed_operation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a random UUID that doesn't correspond to any existing backup record
  const nonExistentBackupRecordId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve a non-existent backup record
  // This tests the error handling for invalid backup record IDs
  await TestValidator.error(
    "should return error for non-existent backup record",
    async () => {
      await api.functional.discussionBoard.superAdmin.backup_records.at(
        superAdminConnection,
        {
          recordId: nonExistentBackupRecordId,
        },
      );
    },
  );
  // Note: Since there's no API to create backup records and they're system-generated,
  // we cannot test retrieval of actual failed backup records. This test validates
  // that the system properly handles requests for non-existent backup records.
}
