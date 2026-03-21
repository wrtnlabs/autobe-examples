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

export async function test_api_employee_department_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins system to obtain JWT token with employee:manage permission
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
  // Step 2: Retrieve employee list to find an employee with existing department assignment
  const employeePage = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        status: "active",
        limit: 100,
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  // Find an employee that has a department assigned
  const employeeWithDepartment = ArrayUtil.has(
    employeePage.data,
    (emp) => emp.department !== null && emp.department !== undefined,
  );
  TestValidator.predicate(
    "should find at least one employee with department",
    employeeWithDepartment,
  );
  const targetEmployee = employeePage.data.find(
    (emp) => emp.department !== null && emp.department !== undefined,
  )!;
  // Step 3: Update employee with departmentId=null to remove department assignment
  const updatedEmployee = await api.functional.erpHrm.admin.employees.update(
    adminConnection,
    {
      employeeId: targetEmployee.id,
      body: {
        departmentId: null,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // Step 4: Validate response shows department is null
  TestValidator.equals(
    "department should be null after removal",
    updatedEmployee.department,
    null,
  );
  TestValidator.equals(
    "employee id should remain unchanged",
    updatedEmployee.id,
    targetEmployee.id,
  );
  TestValidator.equals(
    "member should remain unchanged",
    updatedEmployee.member.id,
    targetEmployee.member.id,
  );
}
