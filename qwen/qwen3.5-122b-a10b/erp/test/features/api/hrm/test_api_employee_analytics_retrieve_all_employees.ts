import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalytic";
import type { IHrmEmployeeAnalyticIDepartmentBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIDepartmentBreakdown";
import type { IHrmEmployeeAnalyticIEmploymentTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIEmploymentTypeBreakdown";
import type { IHrmEmployeeAnalyticIRoleBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIRoleBreakdown";
import type { IHrmEmployeeAnalyticIStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeAnalyticIStatusBreakdown";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving employee analytics for the entire organization without any filters.
 *
 * Validates the primary success path where the system returns comprehensive workforce statistics.
 *
 * 1. Authenticate as a member user with organization context using authorize_member_join
 * 2. Call the analytics endpoint with empty request body (no filters)
 * 3. Verify the response contains total_count and all breakdown arrays
 * 4. Validate all breakdown arrays sum to total_count
 * 5. Verify each breakdown entry has valid category identifier and non-zero count
 * 6. Confirm department and role breakdowns include human-readable names
 * 7. Ensure empty categories are omitted from arrays
 */
export async function test_api_employee_analytics_retrieve_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Call analytics endpoint with no filters (empty body)
  const analytics = await api.functional.hrm.member.employees.analytics.search(
    memberConnection,
    {
      body: {} satisfies IHrmEmployeeAnalytic.IRequest,
    },
  );
  typia.assert(analytics);
  // 3. Validate response structure
  TestValidator.predicate(
    "total_count is non-negative",
    analytics.total_count >= 0,
  );
  TestValidator.predicate(
    "employment_type_breakdown is array",
    Array.isArray(analytics.employment_type_breakdown),
  );
  TestValidator.predicate(
    "status_breakdown is array",
    Array.isArray(analytics.status_breakdown),
  );
  TestValidator.predicate(
    "department_breakdown is array",
    Array.isArray(analytics.department_breakdown),
  );
  TestValidator.predicate(
    "role_breakdown is array",
    Array.isArray(analytics.role_breakdown),
  );
  // 4. Validate breakdowns sum to total_count
  const employmentTypeSum = analytics.employment_type_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const statusSum = analytics.status_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const departmentSum = analytics.department_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const roleSum = analytics.role_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  TestValidator.equals(
    "employment types sum to total",
    employmentTypeSum,
    analytics.total_count,
  );
  TestValidator.equals(
    "statuses sum to total",
    statusSum,
    analytics.total_count,
  );
  TestValidator.equals(
    "departments sum to total",
    departmentSum,
    analytics.total_count,
  );
  TestValidator.equals("roles sum to total", roleSum, analytics.total_count);
  // 5. Validate each employment type entry
  for (const item of analytics.employment_type_breakdown) {
    TestValidator.predicate(
      "employment type count is positive",
      item.count > 0,
    );
  }
  // 6. Validate each status entry
  for (const item of analytics.status_breakdown) {
    TestValidator.predicate("status count is positive", item.count > 0);
  }
  // 7. Validate each department entry
  for (const item of analytics.department_breakdown) {
    TestValidator.predicate("department count is positive", item.count > 0);
    TestValidator.predicate(
      "department name exists",
      item.department_name.length > 0,
    );
  }
  // 8. Validate each role entry
  for (const item of analytics.role_breakdown) {
    TestValidator.predicate("role count is positive", item.count > 0);
    TestValidator.predicate("role name exists", item.role_name.length > 0);
  }
}
