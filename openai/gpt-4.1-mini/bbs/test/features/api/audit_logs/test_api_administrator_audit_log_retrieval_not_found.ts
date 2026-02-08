import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test behavior when an administrator attempts to retrieve an audit log entry that does not exist.
  // Verify the system returns a 404 error and a clear error message indicating audit log entry not found.
  // Confirm edge case for handling invalid UUID format is handled gracefully by the system (but do not test invalid input itself, as validation errors are excluded).
  // 1. Authorize administrator user via join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Generate a random UUID unlikely to exist
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent audit log and expect 404 HttpError
  await TestValidator.httpError(
    "retrieve nonexistent audit log should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.at(
        adminConnection,
        {
          id: nonExistentAuditLogId,
        },
      );
    },
  );
}
