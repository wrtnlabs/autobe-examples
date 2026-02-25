import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_log_retrieve_not_found_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // The superAdminConnection.headers now contain valid Authorization token
  // 2. Attempt to retrieve a non-existent audit log entry by random UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate 404 error for non-existent audit log retrieval
  await TestValidator.httpError(
    "retrieve non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.atAuditLog(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
  // 4. Validate unauthorized access without token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.atAuditLog(
        unauthorizedConnection,
        { id: nonExistentId },
      );
    },
  );
}
