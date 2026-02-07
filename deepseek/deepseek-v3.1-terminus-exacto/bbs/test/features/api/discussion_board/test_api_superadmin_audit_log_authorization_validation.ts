import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
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
 * Test authorization validation for audit log access.
 *
 * This test verifies that only super administrators can retrieve audit log records
 * by attempting access without proper authentication. It validates the security
 * model and privilege separation in the audit trail system.
 */
export async function test_api_superadmin_audit_log_authorization_validation(
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
  // Generate random audit log ID
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Attempt unauthorized access using base connection
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdmin.audit_logs.at(connection, {
      logId,
    });
  });
  // Test 2: Verify authorized access succeeds with super admin authentication
  const auditLog =
    await api.functional.discussionBoard.superAdmin.audit_logs.at(
      superAdminConnection,
      {
        logId,
      },
    );
  typia.assert(auditLog);
}
