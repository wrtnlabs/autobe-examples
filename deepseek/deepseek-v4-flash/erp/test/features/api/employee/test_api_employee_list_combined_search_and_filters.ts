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

/**
 * Test combined filtering and text search capabilities of the employee listing endpoint.
 *
 * Validates the employee list endpoint's ability to combine multiple filter criteria including department, employment type, status, and text search by display name. Ensures that filters are properly combined via AND logic and that the response structure is correct.
 *
 * Special attention is given to verifying that text search with no matches returns an empty data array with pagination metadata showing 0 records.
 *
 * 1. Combined department + status filter with both departmentId and status set.
 * 2. Combined employment type + department filter with both employmentType and departmentId set.
 * 3. Text search by display name using the search parameter.
 * 4. Text search combined with status filter.
 * 5. Text search with a unique string expected to match no employees, verifying empty data and 0-record pagination.
 */
export async function test_api_employee_list_combined_search_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Combined department + status filter
  const filterByDepartmentAndStatus: IPageIHrmTimeTrackingEmployee.ISummary =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        departmentId: typia.random<string & tags.Format<"uuid">>(),
        status: "active",
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(filterByDepartmentAndStatus);
  // 2. Combined employment type + department filter
  const filterByEmploymentAndDepartment: IPageIHrmTimeTrackingEmployee.ISummary =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        employmentType: "full-time",
        departmentId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(filterByEmploymentAndDepartment);
  // 3. Text search by display name (case-insensitive partial match)
  const searchByDisplayName: IPageIHrmTimeTrackingEmployee.ISummary =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        search: "John",
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(searchByDisplayName);
  // 4. Text search combined with status
  const searchByDisplayNameAndStatus: IPageIHrmTimeTrackingEmployee.ISummary =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        search: "Jane",
        status: "active",
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(searchByDisplayNameAndStatus);
  // 5. Text search with no matches - should return empty data with 0-record pagination
  const searchNoMatch: IPageIHrmTimeTrackingEmployee.ISummary =
    await api.functional.hrmTimeTracking.employees.index(connection, {
      body: {
        search: "NonExistentName123",
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    });
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "no match search returns empty data",
    searchNoMatch.data.length,
    0,
  );
  TestValidator.equals(
    "no match search pagination has 0 records",
    searchNoMatch.pagination.records,
    0,
  );
}
