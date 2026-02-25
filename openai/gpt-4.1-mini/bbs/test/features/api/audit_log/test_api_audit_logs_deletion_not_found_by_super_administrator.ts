import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test the deletion attempt of a non-existent audit log entry by a superAdministrator.
 */
export async function test_api_audit_logs_deletion_not_found_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator by join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: undefined,
    },
  );
  // Set the Authorization header with the token
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt deleting a non-existent audit log by random UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect HTTP 404 Not Found on deletion attempt
  await TestValidator.httpError(
    "deleting non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.eraseAuditLog(
        superAdminConnection,
        { id: nonExistentId },
      );
    },
  );
}
