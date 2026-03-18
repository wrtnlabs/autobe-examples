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

export async function test_api_employee_list_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get all employees (baseline)
  const allEmployeesResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(allEmployeesResponse);
  // 3. Test text search
  const searchFirstName =
    memberAuth.organization_memberships[0]?.member.display_name?.split(
      " ",
    )[0] || "test";
  const searchText = searchFirstName.substring(0, 2).toLowerCase();
  const searchResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        search: searchText,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search returns paginated data",
    searchResponse.pagination.current,
    1,
  );
  // 4. Test department filtering
  const firstEmployee = allEmployeesResponse.data[0];
  if (firstEmployee) {
    const departmentFilterResponse =
      await api.functional.hrms.member.employees.index(memberConnection, {
        body: {
          department_id: firstEmployee.department_id,
          limit: 100,
        } satisfies IHrmsEmployee.IRequest,
      });
    typia.assert(departmentFilterResponse);
    TestValidator.equals(
      "department filter returns correct page",
      departmentFilterResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "department filter respects limit",
      departmentFilterResponse.pagination.limit,
      100,
    );
    // All returned employees should have matching department_id
    const allMatchDepartment = departmentFilterResponse.data.every(
      (emp) => emp.department_id === firstEmployee.department_id,
    );
    TestValidator.equals(
      "all department filtered employees match department_id",
      allMatchDepartment,
      true,
    );
  }
  // 5. Test status filtering
  const statusResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(statusResponse);
  TestValidator.equals(
    "status filter returns active employees",
    statusResponse.pagination.current,
    1,
  );
  // 6. Test pagination with specific page and limit
  const paginationResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination page 2",
    paginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit 5",
    paginationResponse.pagination.limit,
    5,
  );
  // Verify records count is consistent
  TestValidator.predicate(
    "pagination records count is valid",
    paginationResponse.pagination.records >= 0,
  );
  // 7. Test sorting by employee_name
  const sortByNameResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        sort: "employee_name",
        order: "asc",
        limit: 100,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(sortByNameResponse);
  TestValidator.equals(
    "sort by name returns valid page",
    sortByNameResponse.pagination.current,
    1,
  );
  // 8. Test combined filters: search + department + status + sort + pagination
  const combinedFilterResponse =
    await api.functional.hrms.member.employees.index(memberConnection, {
      body: {
        search: searchFirstName.substring(0, 3),
        department_id: firstEmployee?.department_id,
        status: "active",
        sort: "total_hours",
        order: "desc",
        page: 1,
        limit: 20,
      } satisfies IHrmsEmployee.IRequest,
    });
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filters return valid pagination",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters respect limit",
    combinedFilterResponse.pagination.limit,
    20,
  );
  // 9. Test page_size alias
  const pageSizeResponse = await api.functional.hrms.member.employees.index(
    memberConnection,
    {
      body: {
        page_size: 10,
      } satisfies IHrmsEmployee.IRequest,
    },
  );
  typia.assert(pageSizeResponse);
  TestValidator.equals(
    "page_size works as limit alias",
    pageSizeResponse.pagination.limit,
    10,
  );
}