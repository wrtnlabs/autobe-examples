import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that admin cannot retrieve employee from different organization (organization isolation).
 *
 * Steps:
 * 1. Create first admin account via POST /erpHrm/auth/admin/join - this creates Organization A with Admin A
 * 2. Create second admin account via POST /erpHrm/auth/admin/join - this creates Organization B with Admin B
 * 3. Extract Admin B's employee ID (Admin B becomes owner/employee of Organization B)
 * 4. Call GET /erpHrm/admin/employees/{employeeId} as Admin A, using Admin B's employee ID
 * 5. Validate 404 Not Found response
 *
 * This validates organization-level data isolation - admins cannot access employees
 * belonging to other organizations, even though both are admins with elevated privileges.
 */
export async function test_api_employee_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first admin account (creates Organization A with Admin A)
  const adminACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminAAuthorized = await authorize_admin_join(adminAConnection, {
    body: adminACredentials,
  });
  typia.assert(adminAAuthorized);
  // Step 2: Create second admin account (creates Organization B with Admin B)
  const adminBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminBAuthorized = await authorize_admin_join(adminBConnection, {
    body: adminBCredentials,
  });
  typia.assert(adminBAuthorized);
  // Step 3: Extract Admin B's employee ID
  // When admin joins, they become an employee/owner of their organization
  // The admin's ID corresponds to the member ID in the employee record
  const adminBEmployeeId = adminBAuthorized.id;
  // Step 4 & 5: As Admin A, try to access Admin B's employee ID
  // This should fail with 404 because Admin B belongs to Organization B,
  // and Admin A cannot access employees from other organizations
  await TestValidator.httpError(
    "admin A cannot access employee from Organization B",
    404,
    async () =>
      await api.functional.erpHrm.admin.employees.at(adminAConnection, {
        employeeId: adminBEmployeeId,
      }),
  );
}
