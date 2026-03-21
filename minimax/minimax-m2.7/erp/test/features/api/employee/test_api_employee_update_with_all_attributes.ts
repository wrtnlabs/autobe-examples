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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test complete employee attribute update with all mutable fields.
 *
 * Steps:
 * 1. Admin joins system
 * 2. Retrieve employee list to find an active employee
 * 3. Update employee with new position='Senior Software Engineer',
 *    employmentType='full-time', status='active', roleId, departmentId
 * 4. Validate response returns updated employee with all changed fields
 */
export async function test_api_employee_update_with_all_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins system
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve employee list to find an active employee
  const employeeListResponse =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        status: "active",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(employeeListResponse);
  // Find an active employee from the list
  const activeEmployee = employeeListResponse.data[0];
  if (!activeEmployee) {
    throw new Error("No active employee found for update testing");
  }
  // 3. Update employee with all mutable attributes
  // For roleId and departmentId, we need to use existing ones from the employee
  // to ensure they belong to the same organization
  const updatedEmployee = await api.functional.erpHrm.admin.employees.update(
    adminConnection,
    {
      employeeId: activeEmployee.id,
      body: {
        position: "Senior Software Engineer",
        employmentType: "full-time",
        status: "active",
        roleId: activeEmployee.role.id,
        departmentId: activeEmployee.department?.id ?? null,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 4. Validate response returns updated employee with all changed fields
  TestValidator.equals(
    "employee ID preserved",
    updatedEmployee.id,
    activeEmployee.id,
  );
  TestValidator.equals(
    "position updated",
    updatedEmployee.position,
    "Senior Software Engineer",
  );
  TestValidator.equals(
    "employment type updated",
    updatedEmployee.employment_type,
    "full-time",
  );
  TestValidator.equals("status updated", updatedEmployee.status, "active");
  TestValidator.equals(
    "role ID preserved",
    updatedEmployee.role.id,
    activeEmployee.role.id,
  );
  // Validate department if it was set
  if (activeEmployee.department) {
    TestValidator.equals(
      "department ID preserved",
      updatedEmployee.department?.id,
      activeEmployee.department.id,
    );
  }
}
