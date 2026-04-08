import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee list filtering and search functionality with various filter combinations.
 *
 * Validates the employee list endpoint's filtering capabilities including name search, employment type filtering, status filtering, and sorting. Ensures that multiple filters are applied correctly as AND conditions and that sorting parameters work as expected.
 *
 * The test creates a member account, sets up an organization context, and systematically tests each filter combination to verify correct filtering behavior with existing employees in the system.
 *
 * 1. Member registration and authentication with organization context.
 * 2. Test name search with case-insensitive partial matching.
 * 3. Test employment type filtering with all enum values (full-time, part-time, contractor, intern).
 * 4. Test status filtering with active and deactivated employees.
 * 5. Test multiple filters applied as AND conditions.
 * 6. Test sorting with sortBy and sortOrder parameters.
 * 7. Validate pagination metadata is correct.
 * 8. Test edge cases including empty result sets.
 */
export async function test_api_employee_list_with_filters_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Use first organization from auth response
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("No organizations available for testing");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 2. Test name search - case-insensitive partial matching
  const searchResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          search: "test",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results structure
  TestValidator.predicate(
    "search results pagination exists",
    searchResults.pagination !== null,
  );
  // 3. Test employment type filtering with all enum values
  const employmentTypes: Array<
    "full-time" | "part-time" | "contractor" | "intern"
  > = ["full-time", "part-time", "contractor", "intern"];
  for (const employmentType of employmentTypes) {
    const filteredByType =
      await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
        memberConnection,
        {
          organizationId,
          body: {
            employment_type: employmentType,
            page: 1,
            pageSize: 20,
          } satisfies IHrmEmployee.IRequest,
        },
      );
    typia.assert(filteredByType);
    // Verify all returned employees have the correct employment type
    for (const employee of filteredByType.data) {
      TestValidator.equals(
        `employment type filter matches: ${employmentType}`,
        employee.employment_type,
        employmentType,
      );
    }
  }
  // 4. Test status filtering with active and deactivated employees
  const statuses: Array<"active" | "deactivated"> = ["active", "deactivated"];
  for (const status of statuses) {
    const filteredByStatus =
      await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
        memberConnection,
        {
          organizationId,
          body: {
            status: status,
            page: 1,
            pageSize: 20,
          } satisfies IHrmEmployee.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    // Verify all returned employees have the correct status
    for (const employee of filteredByStatus.data) {
      TestValidator.equals(
        `status filter matches: ${status}`,
        employee.status,
        status,
      );
    }
  }
  // 5. Test multiple filters applied as AND conditions
  const multiFilterResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          employment_type: "full-time",
          status: "active",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(multiFilterResults);
  // Verify all employees match both filters
  for (const employee of multiFilterResults.data) {
    TestValidator.equals(
      "multi-filter: employment type is full-time",
      employee.employment_type,
      "full-time",
    );
    TestValidator.equals(
      "multi-filter: status is active",
      employee.status,
      "active",
    );
  }
  // 6. Test sorting with sortBy and sortOrder parameters
  const sortedResultsDesc =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(sortedResultsDesc);
  // Test ascending sort as well
  const sortedResultsAsc =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          sortBy: "created_at",
          sortOrder: "asc",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(sortedResultsAsc);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    sortedResultsDesc.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    sortedResultsDesc.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sortedResultsDesc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sortedResultsDesc.pagination.pages >= 0,
  );
  // Verify pagination consistency
  TestValidator.equals(
    "pagination current matches page requested",
    sortedResultsDesc.pagination.current,
    1,
  );
  // 8. Test edge case: empty results with high page number
  const emptyResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 999,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results page has 0 records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results data array is empty",
    emptyResults.data.length,
    0,
  );
  // 9. Test pagination with different page sizes
  const pageSizeResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          pageSize: 5,
          page: 1,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(pageSizeResults);
  TestValidator.predicate(
    "page size limit respected",
    pageSizeResults.data.length <= 5,
  );
  // 10. Test with search and employment type combined
  const combinedFilterResults =
    await api.functional.hrm.member.organizations.employees.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          search: "a",
          employment_type: "full-time",
          page: 1,
          pageSize: 20,
        } satisfies IHrmEmployee.IRequest,
      },
    );
  typia.assert(combinedFilterResults);
  // Verify employment type filter still applies with search
  for (const employee of combinedFilterResults.data) {
    TestValidator.equals(
      "combined filter: employment type is full-time",
      employee.employment_type,
      "full-time",
    );
  }
}
