import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_analytics_department_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to establish authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create member-specific connection with token
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${auth.token.access}` },
  };
  // 3. Get all employees and organize by department
  const allEmployeesResponse =
    await api.functional.hrms.member.employees.analytics.index(
      memberAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(allEmployeesResponse);
  const employeesByDepartment: Map<string, IHrmsEmployee.ISummary[]> =
    new Map();
  for (const employee of allEmployeesResponse.data) {
    const deptId = employee.department_id;
    if (!employeesByDepartment.has(deptId)) {
      employeesByDepartment.set(deptId, []);
    }
    employeesByDepartment.get(deptId)!.push(employee);
  }
  // 4. Select a department with at least 2 employees for testing sorting
  const departmentIds = Array.from(employeesByDepartment.keys());
  const validDepartments = departmentIds.filter(
    (deptId) => employeesByDepartment.get(deptId)!.length >= 2,
  );
  // Handle edge case: if no department has 2+ employees, test with any department
  const selectedDepartmentId =
    validDepartments.length > 0
      ? RandomGenerator.pick(validDepartments)
      : RandomGenerator.pick(departmentIds);
  const employeesInSelectedDept =
    employeesByDepartment.get(selectedDepartmentId)!;
  // 5. Call analytics endpoint with department filter and sorting
  const filteredAndSortedResponse =
    await api.functional.hrms.member.employees.analytics.index(
      memberAuthConnection,
      {
        body: {
          department_id: selectedDepartmentId,
          sort: "total_hours" as const,
          order: "desc" as const,
          limit: 20,
          page: 1,
        } satisfies IHrmsEmployee.IRequest,
      },
    );
  typia.assert(filteredAndSortedResponse);
  // 6. Validate response contains only employees from selected department
  for (const employee of filteredAndSortedResponse.data) {
    TestValidator.equals(
      "employee belongs to selected department",
      employee.department_id,
      selectedDepartmentId,
    );
  }
  // 7. Validate employees are sorted by total_hours_logged in descending order
  for (let i = 0; i < filteredAndSortedResponse.data.length - 1; i++) {
    const currentHours = filteredAndSortedResponse.data[i].total_hours_logged;
    const nextHours = filteredAndSortedResponse.data[i + 1].total_hours_logged;
    TestValidator.predicate(
      `employee ${i} has more hours than employee ${i + 1}`,
      currentHours >= nextHours,
    );
  }
  // 8. Validate first employee has highest hours when data exists
  if (filteredAndSortedResponse.data.length > 0) {
    const firstEmployeeHours =
      filteredAndSortedResponse.data[0].total_hours_logged;
    const maxHours = Math.max(
      ...employeesInSelectedDept.map((e) => e.total_hours_logged),
    );
    TestValidator.equals(
      "first employee has highest hours in department",
      firstEmployeeHours,
      maxHours,
    );
  }
  // 9. Validate pagination metadata reflects filtered dataset
  TestValidator.equals(
    "pagination total_count matches filtered employee count",
    filteredAndSortedResponse.pagination.records,
    employeesInSelectedDept.length,
  );
  // 10. Validate pagination current page
  TestValidator.equals(
    "pagination current page is 1",
    filteredAndSortedResponse.pagination.current,
    1,
  );
  // 11. Validate pagination limit
  TestValidator.equals(
    "pagination limit is 20",
    filteredAndSortedResponse.pagination.limit,
    20,
  );
  // 12. Validate pagination pages count
  TestValidator.predicate(
    "pagination pages count is correct",
    filteredAndSortedResponse.pagination.pages ===
      Math.ceil(employeesInSelectedDept.length / 20),
  );
  // 13. Edge case: validate empty filter behavior
  const emptyFilterResponse =
    await api.functional.hrms.member.employees.analytics.index(
      memberAuthConnection,
      {
        body: {
          department_id: "00000000-0000-0000-0000-000000000000",
          limit: 20,
          page: 1,
        } satisfies IHrmsEmployee.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "empty filter returns no results",
    emptyFilterResponse.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination records is 0",
    emptyFilterResponse.pagination.records,
    0,
  );
}