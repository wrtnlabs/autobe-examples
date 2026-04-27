import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_employee_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection (no auth needed per spec)
  const employeeConnection: api.IConnection = { host: connection.host };
  // 1. First page with limit=2
  const page1 = await api.functional.hrmTimeTracking.employees.index(
    employeeConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 data at most 2 records",
    page1.data.length <= 2,
  );
  // 2. Second page with limit=2
  const page2 = await api.functional.hrmTimeTracking.employees.index(
    employeeConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.predicate(
    "page 2 data at most 2 records",
    page2.data.length <= 2,
  );
  // 3. All employees with limit=100
  const allEmployees = await api.functional.hrmTimeTracking.employees.index(
    employeeConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(allEmployees);
  TestValidator.equals("all page current", allEmployees.pagination.current, 1);
  TestValidator.equals("all page limit", allEmployees.pagination.limit, 100);
  // 4. Pagination metadata consistency
  if (allEmployees.data.length < 100) {
    TestValidator.equals(
      "total records matches data length when all fit on one page",
      allEmployees.pagination.records,
      allEmployees.data.length,
    );
  } else {
    TestValidator.predicate(
      "total records at least 100 when more exist",
      allEmployees.pagination.records >= 100,
    );
  }
  if (allEmployees.pagination.records > 0) {
    const expectedPages = Math.ceil(
      allEmployees.pagination.records / allEmployees.pagination.limit,
    );
    TestValidator.equals(
      "total pages computed correctly",
      allEmployees.pagination.pages,
      expectedPages,
    );
  }
  // 5. Verify each employee record structure via typia.assert
  for (const employee of allEmployees.data) {
    typia.assert(employee);
  }
  // 6. Verify sorting by created_at descending
  if (allEmployees.data.length >= 2) {
    for (let i = 1; i < allEmployees.data.length; i++) {
      const prev = new Date(allEmployees.data[i - 1].created_at).getTime();
      const curr = new Date(allEmployees.data[i].created_at).getTime();
      TestValidator.predicate(
        `employee at index ${i - 1} created_at >= index ${i}`,
        prev >= curr,
      );
    }
  }
  // 7. Verify no soft-deleted employees returned (business logic validation)
  for (const employee of allEmployees.data) {
    TestValidator.predicate(
      `employee ${employee.id} is not soft-deleted`,
      employee.deleted_at === null,
    );
  }
  // 8. Verify pages return different data when enough records exist
  if (
    allEmployees.data.length > 2 &&
    page1.data.length > 0 &&
    page2.data.length > 0
  ) {
    TestValidator.notEquals(
      "page 1 and page 2 data differ",
      page1.data.map((e) => e.id),
      page2.data.map((e) => e.id),
    );
  }
}
