import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
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
 * Test handling of non-existent error log entry retrieval.
 * This scenario validates that the system properly handles requests for error log entries
 * that do not exist in the database. The test verifies that the endpoint returns an
 * appropriate 404 error response when provided with a valid UUID format that does not
 * correspond to any existing error log record.
 */
export async function test_api_error_log_retrieval_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid UUID that does not exist in the database
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent error log and validate 404 error
  await TestValidator.httpError(
    "non-existent error log should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.error_logs.at(
        superAdminConnection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );
}
