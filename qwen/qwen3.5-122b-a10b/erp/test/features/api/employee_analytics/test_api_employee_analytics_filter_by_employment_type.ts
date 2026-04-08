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
 * Test retrieving employee analytics filtered by specific employment types.
 *
 * Validates that filtering employee analytics by employment types correctly narrows the analytics scope and returns accurate aggregated data for the filtered subset.
 *
 * This test authenticates a member user, calls the analytics endpoint with employment type filters, and validates that the response structure and counts reflect only employees matching the specified employment types.
 *
 * 1. Create and authenticate a member account with organization context.
 * 2. Call the employee analytics endpoint with employment_types filter containing specific types (e.g., ['full-time', 'contractor']).
 * 3. Validate the response structure:
 *    - total_count matches the sum of employees with filtered employment types
 *    - employment_type_breakdown contains only the filtered types that have employees
 *    - status_breakdown reflects status distribution of filtered employees only
 *    - department_breakdown shows department distribution for filtered employees
 *    - role_breakdown shows role distribution for filtered employees
 * 4. Verify that employment_type_breakdown only includes requested types that have employees (empty categories omitted).
 */
export async function test_api_employee_analytics_filter_by_employment_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Call analytics endpoint with employment type filter
  const filteredTypes: Array<
    "full-time" | "part-time" | "contractor" | "intern"
  > = ["full-time", "contractor"];
  const analytics = await api.functional.hrm.member.employees.analytics.search(
    memberConnection,
    {
      body: {
        employment_types: filteredTypes,
      } satisfies IHrmEmployeeAnalytic.IRequest,
    },
  );
  typia.assert(analytics);
  // 3. Validate response structure and filtering logic
  // total_count should be non-negative
  TestValidator.predicate(
    "total count is non-negative",
    analytics.total_count >= 0,
  );
  // employment_type_breakdown should only contain filtered types that have employees
  const breakdownTypes = analytics.employment_type_breakdown.map(
    (item) => item.employment_type,
  );
  TestValidator.predicate(
    "employment type breakdown only contains filtered types",
    breakdownTypes.every((type) => filteredTypes.includes(type)),
  );
  // Sum of employment type breakdown counts should equal total_count
  const breakdownSum = analytics.employment_type_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  TestValidator.equals(
    "breakdown sum matches total count",
    breakdownSum,
    analytics.total_count,
  );
  // Validate status breakdown structure
  TestValidator.predicate(
    "status breakdown is array",
    Array.isArray(analytics.status_breakdown),
  );
  const statusSum = analytics.status_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  TestValidator.equals(
    "status breakdown sum matches total count",
    statusSum,
    analytics.total_count,
  );
  // Validate department breakdown structure
  TestValidator.predicate(
    "department breakdown is array",
    Array.isArray(analytics.department_breakdown),
  );
  const departmentSum = analytics.department_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  TestValidator.equals(
    "department breakdown sum matches total count",
    departmentSum,
    analytics.total_count,
  );
  // Validate role breakdown structure
  TestValidator.predicate(
    "role breakdown is array",
    Array.isArray(analytics.role_breakdown),
  );
  const roleSum = analytics.role_breakdown.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  TestValidator.equals(
    "role breakdown sum matches total count",
    roleSum,
    analytics.total_count,
  );
}
