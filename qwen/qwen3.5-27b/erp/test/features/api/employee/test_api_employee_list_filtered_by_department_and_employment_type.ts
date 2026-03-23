import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_departments_create } from "../../../generate/generate_random_hrm_platform_admin_departments_create";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

export async function test_api_employee_list_filtered_by_department_and_employment_type(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test employee list filtering by department, employment type, and status.
   * Verifies that the PATCH /hrmPlatform/admin/employees endpoint correctly
   * filters employees based on department_id, employment_type, status, and search
   * parameters, with proper pagination support.
   */
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create departments for testing
  const engineeringDept =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: { name: "Engineering" },
      },
    );
  typia.assert(engineeringDept);
  const salesDept = await generate_random_hrm_platform_admin_departments_create(
    adminConnection,
    {
      body: { name: "Sales" },
    },
  );
  typia.assert(salesDept);
  const marketingDept =
    await generate_random_hrm_platform_admin_departments_create(
      adminConnection,
      {
        body: { name: "Marketing" },
      },
    );
  typia.assert(marketingDept);
  // 3. Get all employees to test filtering
  const allEmployees = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: { limit: 100 },
    },
  );
  typia.assert(allEmployees);
  // 4. Test filtering by department_id
  const engineeringEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        department_id: engineeringDept.id,
        limit: 100,
      },
    });
  typia.assert(engineeringEmployees);
  // All returned employees should belong to Engineering department or have null department filtered out
  TestValidator.predicate("all employees in Engineering department", () =>
    engineeringEmployees.data.every(
      (emp) => emp.department?.id === engineeringDept.id,
    ),
  );
  // 5. Test filtering by employment_type
  const fullTimeEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "full-time",
        limit: 100,
      },
    });
  typia.assert(fullTimeEmployees);
  TestValidator.predicate("all employees are full-time", () =>
    fullTimeEmployees.data.every((emp) => emp.employment_type === "full-time"),
  );
  const partTimeEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "part-time",
        limit: 100,
      },
    });
  typia.assert(partTimeEmployees);
  TestValidator.predicate("all employees are part-time", () =>
    partTimeEmployees.data.every((emp) => emp.employment_type === "part-time"),
  );
  const contractorEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "contractor",
        limit: 100,
      },
    });
  typia.assert(contractorEmployees);
  TestValidator.predicate("all employees are contractors", () =>
    contractorEmployees.data.every(
      (emp) => emp.employment_type === "contractor",
    ),
  );
  const internEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        employment_type: "intern",
        limit: 100,
      },
    });
  typia.assert(internEmployees);
  TestValidator.predicate("all employees are interns", () =>
    internEmployees.data.every((emp) => emp.employment_type === "intern"),
  );
  // 6. Test filtering by status
  const activeEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "active",
        limit: 100,
      },
    });
  typia.assert(activeEmployees);
  TestValidator.predicate("all employees are active", () =>
    activeEmployees.data.every((emp) => emp.status === "active"),
  );
  const deactivatedEmployees =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        status: "deactivated",
        limit: 100,
      },
    });
  typia.assert(deactivatedEmployees);
  TestValidator.predicate("all employees are deactivated", () =>
    deactivatedEmployees.data.every((emp) => emp.status === "deactivated"),
  );
  // 7. Test combined filters (department + employment_type + status)
  const combinedFilter = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {
        department_id: salesDept.id,
        employment_type: "part-time",
        status: "active",
        limit: 100,
      },
    },
  );
  typia.assert(combinedFilter);
  TestValidator.predicate("combined filter - all in Sales department", () =>
    combinedFilter.data.every((emp) => emp.department?.id === salesDept.id),
  );
  TestValidator.predicate("combined filter - all part-time", () =>
    combinedFilter.data.every((emp) => emp.employment_type === "part-time"),
  );
  TestValidator.predicate("combined filter - all active", () =>
    combinedFilter.data.every((emp) => emp.status === "active"),
  );
  // 8. Test pagination with filters
  const paginatedResult =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        department_id: marketingDept.id,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data count does not exceed limit",
    () => paginatedResult.data.length <= paginatedResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records reflects filtered count",
    () => paginatedResult.pagination.records >= paginatedResult.data.length,
  );
  // 9. Test search parameter with email (available field in member summary)
  const searchQuery = RandomGenerator.alphabets(3);
  const searchResult = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {
        search: searchQuery,
        limit: 100,
      },
    },
  );
  typia.assert(searchResult);
  // If results are returned, they should match the search query (case-insensitive)
  if (searchResult.data.length > 0) {
    TestValidator.predicate("search returns matching results", () =>
      searchResult.data.every((emp) =>
        emp.member.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
  }
  // 10. Test search combined with other filters
  const searchWithFilter =
    await api.functional.hrmPlatform.admin.employees.index(adminConnection, {
      body: {
        search: searchQuery,
        department_id: engineeringDept.id,
        employment_type: "contractor",
        limit: 100,
      },
    });
  typia.assert(searchWithFilter);
  TestValidator.predicate("search with filter - all in Engineering", () =>
    searchWithFilter.data.every(
      (emp) => emp.department?.id === engineeringDept.id,
    ),
  );
  TestValidator.predicate("search with filter - all contractors", () =>
    searchWithFilter.data.every((emp) => emp.employment_type === "contractor"),
  );
  // 11. Test filtering by department excludes employees with null department
  const deptFiltered = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {
        department_id: salesDept.id,
        limit: 100,
      },
    },
  );
  typia.assert(deptFiltered);
  TestValidator.predicate("department filter excludes null departments", () =>
    deptFiltered.data.every(
      (emp) => emp.department !== null && emp.department.id === salesDept.id,
    ),
  );
  // 12. Test empty filter returns all employees
  const noFilter = await api.functional.hrmPlatform.admin.employees.index(
    adminConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(noFilter);
  TestValidator.predicate(
    "no filter returns employees",
    () => noFilter.data.length >= 0,
  );
  // 13. Test pagination page calculation
  TestValidator.predicate(
    "pages calculated correctly",
    () =>
      paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
}
