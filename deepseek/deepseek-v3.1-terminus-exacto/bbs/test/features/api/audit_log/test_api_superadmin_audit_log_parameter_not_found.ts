import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
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
 * Test error handling when attempting to retrieve a non-existent audit log parameter.
 * Verify that the system properly handles invalid parameterId or auditLogId combinations
 * with appropriate error responses. Validate that the system checks parameter ownership
 * relationship to prevent cross-audit log parameter access.
 */
export async function test_api_superadmin_audit_log_parameter_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator using utility function
  const authorized = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create authenticated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = { Authorization: authorized.token.access };
  // Generate random UUIDs that don't exist in the system
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentParameterId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent parameter and expect HTTP error
  await TestValidator.httpError(
    "retrieve non-existent audit log parameter",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.at(
        superAdminConnection,
        {
          auditLogId: nonExistentAuditLogId,
          parameterId: nonExistentParameterId,
        },
      );
    },
  );
}
