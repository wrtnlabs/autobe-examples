import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

export async function test_api_employee_filtering_by_employment_type_and_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Get all employees to find existing department IDs and employment types
  const allEmployeesResponse =
    await api.functional.erpHrm.admin.employees.index(adminConnection, {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    });
  typia.assert(allEmployeesResponse);
  // Find a valid department ID from existing employees for filtering
  const employeeWithDepartment = allEmployeesResponse.data.find(
    (emp) => emp.department !== null && emp.department !== undefined,
  );
  if (!employeeWithDepartment) {
    // If no employees with departments exist, test with employment type filter only
    const filteredResponse = await api.functional.erpHrm.admin.employees.index(
      adminConnection,
      {
        body: {
          employment_type: "full-time",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies IErpHrmEmployee.IRequest,
      },
    );
    typia.assert(filteredResponse);
    // Validate employment_type matches filter in all returned employees
    for (const employee of filteredResponse.data) {
      TestValidator.equals(
        "employment_type matches filter",
        employee.employment_type,
        "full-time",
      );
    }
    return;
  }
  // 3. Call PATCH /erpHrm/admin/employees with filter parameters
  const departmentId = employeeWithDepartment.department!.id;
  const targetEmploymentType = "full-time" as const;
  const filteredResponse = await api.functional.erpHrm.admin.employees.index(
    adminConnection,
    {
      body: {
        employment_type: targetEmploymentType,
        erp_hrm_department_id: departmentId,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: 1,
      } satisfies IErpHrmEmployee.IRequest,
    },
  );
  typia.assert(filteredResponse);
  // 4. Verify employment_type matches filter in all returned employees
  for (const employee of filteredResponse.data) {
    TestValidator.equals(
      "employment_type matches filter",
      employee.employment_type,
      targetEmploymentType,
    );
    // 5. Verify department matches the filter or is null when not assigned
    if (employee.department !== null && employee.department !== undefined) {
      TestValidator.equals(
        "department matches filter",
        employee.department.id,
        departmentId,
      );
    }
  }
}
