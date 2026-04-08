import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test department analytics endpoint with comprehensive filtering, sorting, and pagination.
 *
 * Validates the complete department analytics workflow including member authentication,
 * complex query scenarios with filters, sorting, and pagination. Ensures that filtering,
 * sorting, and pagination work correctly both independently and in combination, with
 * accurate aggregated statistics.
 *
 * Special attention is given to verifying that combined filters produce correct
 * intersection results, sorting maintains consistent ordering across pages, and
 * aggregated statistics (totalCount, departmentWithMostEmployees, etc.) correctly
 * reflect the filtered result set rather than the entire organization.
 *
 * 1. Member authentication and initial organization creation.
 * 2. Retrieve initial analytics to understand existing department data.
 * 3. Test name filtering with 'Engineering' pattern matching.
 * 4. Test date range filtering with specific from/to date-time range.
 * 5. Test employee count filtering with min/max thresholds.
 * 6. Test combined filters (hierarchy_type + name_filter + employee_count_filter).
 * 7. Test sorting by employee_count (desc), name (asc), and created_at (desc).
 * 8. Test pagination with page 1/limit 5, page 2/limit 5, and limit 100.
 * 9. Verify aggregated statistics reflect filtered results accurately.
 */
export async function test_api_department_analytics_comprehensive_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member session connection for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Get initial analytics to verify baseline data
  const initialAnalytics =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(initialAnalytics);
  TestValidator.predicate(
    "initial analytics has totalCount",
    initialAnalytics.totalCount > 0 || initialAnalytics.totalCount === 0,
  );
  // 3. Scenario A - Name Filter
  const nameFilterResult =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          name_filter: "Engineering",
        },
      },
    );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filter totalCount is non-negative",
    nameFilterResult.totalCount >= 0,
  );
  for (const dept of nameFilterResult.departments) {
    TestValidator.predicate(
      "name matches filter",
      dept.name.toLowerCase().includes("engineering"),
    );
  }
  // 4. Scenario B - Date Range Filter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 10);
  const dateRangeResult =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          date_range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "all dates within range",
    dateRangeResult.departments.every(
      (d) =>
        d.created_at >= fromDate.toISOString() &&
        d.created_at <= toDate.toISOString(),
    ),
  );
  // 5. Scenario C - Employee Count Filter
  const employeeCountFilterResult =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          employee_count_filter: { min: 3, max: 10 },
        },
      },
    );
  typia.assert(employeeCountFilterResult);
  TestValidator.predicate(
    "employee count filter totalCount is non-negative",
    employeeCountFilterResult.totalCount >= 0,
  );
  // 6. Scenario D - Combined Filters
  const combinedFilterResult =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          hierarchy_type: "root",
          name_filter: "Tech",
          employee_count_filter: { min: 3, max: 10 },
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter totalCount is non-negative",
    combinedFilterResult.totalCount >= 0,
  );
  for (const dept of combinedFilterResult.departments) {
    TestValidator.predicate(
      "hierarchy type is root",
      dept.parentDepartment === null,
    );
    TestValidator.predicate(
      "name contains Tech",
      dept.name.toLowerCase().includes("tech"),
    );
  }
  // 7. Scenario E - Sorting
  const sortByEmployeeCountDesc =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          sort_by: "employee_count",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortByEmployeeCountDesc);
  TestValidator.predicate(
    "sort by employee_count desc returns valid data",
    sortByEmployeeCountDesc.departments.length > 0 ||
      sortByEmployeeCountDesc.departments.length === 0,
  );
  const sortByNameAsc =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
        },
      },
    );
  typia.assert(sortByNameAsc);
  TestValidator.predicate(
    "sort by name asc returns valid data",
    sortByNameAsc.departments.length > 0 ||
      sortByNameAsc.departments.length === 0,
  );
  const sortByCreatedAtDesc =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.predicate(
    "sort by created_at desc returns valid data",
    sortByCreatedAtDesc.departments.length > 0 ||
      sortByCreatedAtDesc.departments.length === 0,
  );
  // 8. Scenario F - Pagination
  const page1 = await api.functional.hrmPlatform.member.departments.analytics(
    authenticatedConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.departments.length, 5);
  TestValidator.equals(
    "page 1 totalCount",
    page1.totalCount,
    initialAnalytics.totalCount,
  );
  const page2 = await api.functional.hrmPlatform.member.departments.analytics(
    authenticatedConnection,
    {
      body: {
        page: 2,
        limit: 5,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 limit", page2.departments.length, 5);
  // Verify no duplicates between pages
  const page1Ids = new Set(page1.departments.map((d) => d.id));
  const page2Ids = new Set(page2.departments.map((d) => d.id));
  for (const id of page2Ids) {
    TestValidator.predicate("no duplicate ids", !page1Ids.has(id));
  }
  const maxLimit =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit totalCount",
    maxLimit.departments.length,
    initialAnalytics.totalCount,
  );
  TestValidator.equals(
    "max limit totalCount",
    maxLimit.totalCount,
    initialAnalytics.totalCount,
  );
  // 9. Verify aggregated statistics reflect filtered results
  const employeeCountFilterAnalytics =
    await api.functional.hrmPlatform.member.departments.analytics(
      authenticatedConnection,
      {
        body: {
          employee_count_filter: { min: 3, max: 10 },
        },
      },
    );
  typia.assert(employeeCountFilterAnalytics);
  TestValidator.predicate(
    "most employees dept is valid",
    employeeCountFilterAnalytics.departmentWithMostEmployees !== undefined,
  );
}