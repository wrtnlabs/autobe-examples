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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_employee_role_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins system to obtain JWT token with employee:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Retrieve employee list to find existing employee ID for role change
  const employeeList = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        status: "active",
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeeList);
  // Find an employee with a role
  const employee = employeeList.data.find((e) => e.role && e.role.id);
  if (!employee) {
    throw new Error("No employee with role found in the employee list");
  }
  const currentRoleId = employee.role.id;
  // 3. Retrieve available roles to identify role for reassignment
  const roleList = await api.functional.erpHrm.admin.roles.index(
    adminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(roleList);
  // Find a different role in the same organization
  const newRole = roleList.data.find(
    (r) =>
      r.id !== currentRoleId &&
      r.organization.id === employee.role.organization.id,
  );
  if (!newRole) {
    throw new Error("No different role found in the same organization");
  }
  // 4. Update employee with different roleId while keeping other fields unchanged
  const updatedEmployee = await api.functional.erpHrm.admin.employees.update(
    adminConnection,
    {
      employeeId: employee.id,
      body: {
        roleId: newRole.id,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 5. Validate response shows new role assigned and role change takes effect immediately
  TestValidator.equals(
    "employee id unchanged",
    updatedEmployee.id,
    employee.id,
  );
  TestValidator.equals(
    "new role assigned",
    updatedEmployee.role.id,
    newRole.id,
  );
  TestValidator.equals(
    "role name updated",
    updatedEmployee.role.name,
    newRole.name,
  );
  TestValidator.equals(
    "organization unchanged",
    updatedEmployee.role.organization.id,
    employee.role.organization.id,
  );
}