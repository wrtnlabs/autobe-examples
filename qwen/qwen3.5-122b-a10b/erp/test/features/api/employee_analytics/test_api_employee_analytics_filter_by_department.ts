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
 * Test employee analytics retrieval filtered by department.
 *
 * Validates that employee analytics endpoint correctly filters and aggregates employee data when a department filter is applied. Ensures department-specific workforce statistics are accurate and properly isolated from other departments.
 *
 * The test verifies the filtering mechanism by applying a department_id filter and confirming that:
 * - Only employees within the filtered department are counted
 * - All breakdown arrays reflect only the filtered department's employees
 * - The department breakdown contains only the filtered department entry
 * - Empty results are handled correctly when no employees match the filter
 *
 * 1. Authenticate as a member user with organization context.
 * 2. Generate a department_id filter (may not exist, testing edge case).
 * 3. Call analytics endpoint with department_id filter.
 * 4. Validate response structure and type safety.
 * 5. Validate breakdown sums equal total_count.
 * 6. Validate department breakdown contains only filtered department when results exist.
 * 7. Validate zero counts when no employees match the filter.
 */
export async function test_api_employee_analytics_filter_by_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
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
  // 2. Generate a department_id filter
  // Note: This tests the edge case where the department may not exist or have no employees
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call analytics endpoint with department_id filter
  const analytics = await api.functional.hrm.member.employees.analytics.search(
    memberConnection,
    {
      body: {
        department_id: departmentId,
      } satisfies IHrmEmployeeAnalytic.IRequest,
    },
  );
  typia.assert(analytics);
  // 4. Validate response structure
  TestValidator.predicate("has total count", analytics.total_count >= 0);
  TestValidator.predicate(
    "has employment type breakdown",
    Array.isArray(analytics.employment_type_breakdown),
  );
  TestValidator.predicate(
    "has status breakdown",
    Array.isArray(analytics.status_breakdown),
  );
  TestValidator.predicate(
    "has department breakdown",
    Array.isArray(analytics.department_breakdown),
  );
  TestValidator.predicate(
    "has role breakdown",
    Array.isArray(analytics.role_breakdown),
  );
  // 5. Validate breakdown sums equal total_count
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
    "employment type breakdown sum equals total",
    employmentTypeSum,
    analytics.total_count,
  );
  TestValidator.equals(
    "status breakdown sum equals total",
    statusSum,
    analytics.total_count,
  );
  TestValidator.equals(
    "department breakdown sum equals total",
    departmentSum,
    analytics.total_count,
  );
  TestValidator.equals(
    "role breakdown sum equals total",
    roleSum,
    analytics.total_count,
  );
  // 6. Validate department breakdown contains only filtered department when results exist
  if (analytics.department_breakdown.length > 0) {
    TestValidator.equals(
      "department breakdown has only one entry",
      analytics.department_breakdown.length,
      1,
    );
    TestValidator.equals(
      "filtered department matches",
      analytics.department_breakdown[0]?.department_id,
      departmentId,
    );
  } else {
    // 7. Validate zero counts when no employees match the filter
    TestValidator.equals(
      "total count is zero for non-existent department",
      analytics.total_count,
      0,
    );
    TestValidator.equals(
      "employment type breakdown is empty",
      analytics.employment_type_breakdown.length,
      0,
    );
    TestValidator.equals(
      "status breakdown is empty",
      analytics.status_breakdown.length,
      0,
    );
    TestValidator.equals(
      "role breakdown is empty",
      analytics.role_breakdown.length,
      0,
    );
  }
}
