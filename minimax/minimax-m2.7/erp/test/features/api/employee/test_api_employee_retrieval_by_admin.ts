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
 * Test retrieving an active employee record by admin.
 *
 * Steps:
 * 1. Create admin account via POST /erpHrm/auth/admin/join - this creates an organization
 *    with the admin as owner and an associated employee record
 * 2. Extract the admin's employee ID from the response
 * 3. Call GET /erpHrm/admin/employees/{employeeId} with the admin's employee ID
 * 4. Validate 200 OK response contains:
 *    - Employee fields: id, position, employment_type, status
 *    - Nested member object with user profile (id, email, displayName)
 *    - Nested role object with name and is_builtin flag
 *    - Nested organization object with basic info
 *    - Nested contracts array (may be empty if no contracts)
 *    - Department should be null if not assigned
 *
 * This validates the primary success path where an admin retrieves a complete
 * employee record with all related entities joined.
 */
export async function test_api_employee_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract admin's employee ID from the authorized response
  // The admin join creates an organization and an associated employee record
  // The employee ID should be available in the response structure
  const adminEmployeeId: string & tags.Format<"uuid"> = authorized.id;
  // 3. Retrieve the employee record by admin
  const employee = await api.functional.erpHrm.admin.employees.at(
    adminConnection,
    {
      employeeId: adminEmployeeId,
    },
  );
  typia.assert(employee);
  // 4. Validate employee record structure
  // Validate required fields exist
  TestValidator.equals("employee id matches", employee.id, adminEmployeeId);
  TestValidator.equals(
    "employment type exists",
    employee.employment_type !== undefined,
    true,
  );
  TestValidator.equals("status exists", employee.status !== undefined, true);
  // Validate nested member object
  TestValidator.equals(
    "member id exists",
    employee.member.id !== undefined,
    true,
  );
  TestValidator.equals(
    "member email exists",
    employee.member.email !== undefined,
    true,
  );
  TestValidator.equals(
    "member displayName exists",
    employee.member.displayName !== undefined,
    true,
  );
  // Validate nested role object
  TestValidator.equals("role id exists", employee.role.id !== undefined, true);
  TestValidator.equals(
    "role name exists",
    employee.role.name !== undefined,
    true,
  );
  TestValidator.equals(
    "role is_builtin exists",
    employee.role.is_builtin !== undefined,
    true,
  );
  // Validate nested organization object
  TestValidator.equals(
    "organization id exists",
    employee.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization name exists",
    employee.organization.name !== undefined,
    true,
  );
  // Validate contracts array exists
  TestValidator.equals(
    "contracts is array",
    Array.isArray(employee.contracts),
    true,
  );
  // Department should be null if not assigned
  TestValidator.equals(
    "department is null for new admin",
    employee.department === null || employee.department === undefined,
    true,
  );
}
