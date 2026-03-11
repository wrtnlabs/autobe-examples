import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent audit log entry.
 * Authenticate as super admin, then attempt to retrieve an audit log using a
 * randomly generated UUID that does not exist in the system. Validate that
 * the operation returns a 404 error response with appropriate error message
 * indicating the audit log entry was not found.
 */
export async function test_api_audit_log_retrieval_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a random UUID that does not exist in the system
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent audit log and validate 404 error
  await TestValidator.httpError(
    "retrieve non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.audit_logs.at(
        adminConnection,
        {
          logId: nonExistentLogId,
        },
      );
    },
  );
}
