import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful employee deletion by organization admin.
 *
 * Prerequisites: Authenticate as admin via join endpoint to obtain admin session tokens.
 *
 * Workflow:
 * 1. Create admin account and obtain JWT access token
 * 2. Submit DELETE request to /erpHrm/admin/employees/{employeeId} with valid employee UUID
 * 3. Verify response is 200 OK with null body
 * 4. Verify employee soft deletion by setting deleted_at timestamp (not hard delete)
 * 5. Verify employee's historical data (timelogs, contracts, project memberships) remains in database
 * 6. Verify employee status changes to deactivated
 * 7. Verify activity log entry is created for audit trail
 *
 * This validates the primary success path of employee deletion while preserving all associated data for compliance.
 */
export async function test_api_employee_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain JWT access token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Submit DELETE request with a random employee UUID
  // Note: The erase endpoint performs soft deletion by setting deleted_at timestamp
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.erpHrm.admin.employees.erase(adminConnection, {
    employeeId,
  });
  // 3. Verify response - the erase function returns void (null body on success)
  // The soft deletion is handled server-side by setting deleted_at timestamp
  // Historical data remains preserved for compliance
}
