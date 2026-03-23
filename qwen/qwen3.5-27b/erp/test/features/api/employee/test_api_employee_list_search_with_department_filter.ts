import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee listing with search and department filtering functionality.
 * Verifies case-insensitive partial name matching, department filtering,
 * combined filter logic, and pagination accuracy.
 */
export async function test_api_employee_list_search_with_department_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. List employees with search functionality
  // Test case-insensitive partial name matching
  const searchResults = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "john",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(searchResults);
  // Validate search results have valid pagination
  TestValidator.predicate(
    "search results have non-negative record count",
    searchResults.pagination.records >= 0,
  );
  // 3. Test department filtering
  // First, get all employees to find a department_id
  const allEmployees = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  // Find an employee with a department assignment
  const employeeWithDepartment = allEmployees.data.find(
    (emp) => emp.department !== null,
  );
  if (employeeWithDepartment && employeeWithDepartment.department) {
    const departmentId = employeeWithDepartment.department.id;
    // Test filtering by department_id
    const departmentFiltered =
      await api.functional.hrmPlatform.member.employees.index(
        memberConnection,
        {
          body: {
            department_id: departmentId,
            page: 1,
            limit: 20,
          } satisfies IHrmPlatformEmployee.IRequest,
        },
      );
    typia.assert(departmentFiltered);
    // Validate all results belong to the specified department
    TestValidator.predicate(
      "all employees belong to filtered department",
      departmentFiltered.data.every(
        (emp) => emp.department !== null && emp.department.id === departmentId,
      ),
    );
    // Test combined search and department filter
    const combinedFiltered =
      await api.functional.hrmPlatform.member.employees.index(
        memberConnection,
        {
          body: {
            search: "john",
            department_id: departmentId,
            page: 1,
            limit: 20,
          } satisfies IHrmPlatformEmployee.IRequest,
        },
      );
    typia.assert(combinedFiltered);
    // Validate combined filter results match both criteria
    // Note: Search matches on member email (the only available field in ISummary)
    TestValidator.predicate(
      "combined filter results match search term in email",
      combinedFiltered.data.every((emp) =>
        emp.member.email.toLowerCase().includes("john"),
      ),
    );
    TestValidator.predicate(
      "combined filter results belong to department",
      combinedFiltered.data.every(
        (emp) => emp.department !== null && emp.department.id === departmentId,
      ),
    );
  }
  // 4. Test empty search results
  const emptySearch = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "xyznonexistentname12345",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(emptySearch);
  // Validate empty results
  TestValidator.equals(
    "empty search has zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search data array is empty",
    emptySearch.data.length,
    0,
  );
  // 5. Test pagination with custom limit
  const paginatedResults =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(paginatedResults);
  // Validate pagination respects limit
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginatedResults.data.length <= 10,
  );
}
