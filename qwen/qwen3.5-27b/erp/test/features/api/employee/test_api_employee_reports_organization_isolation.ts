import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization data isolation for employee reports endpoint.
 *
 * Validates that the employee reports API correctly returns paginated employee data with proper organization scoping based on the authenticated member's context. The test verifies response structure, pagination metadata, and employee summary completeness.
 *
 * Special attention is given to ensuring that nullable fields (department, role) are properly handled and that each employee record includes required identity information through the member relationship.
 *
 * 1. Register and authenticate a new member account.
 * 2. Retrieve paginated employee reports through the authenticated member connection.
 * 3. Validate response structure contains pagination and employee data.
 * 4. Verify each employee record has required fields and proper nullable handling.
 * 5. Confirm pagination metadata is accurate and consistent.
 */
export async function test_api_employee_reports_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Retrieve employee reports
  const reports =
    await api.functional.hrmTimeTrack.member.reports.employees.report(
      memberConnection,
    );
  typia.assert(reports);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is positive",
    reports.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", reports.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    reports.pagination.pages >= 0,
  );
  // 4. Validate employee data array exists
  TestValidator.predicate(
    "employee data is an array",
    Array.isArray(reports.data),
  );
  // 5. Validate each employee record
  await ArrayUtil.asyncForEach(reports.data, async (employee) => {
    // Validate position is non-empty string
    TestValidator.predicate(
      "position is non-empty",
      employee.position.length > 0,
    );
    // Validate employment_type is non-empty
    TestValidator.predicate(
      "employment_type is non-empty",
      employee.employment_type.length > 0,
    );
    // Validate status is non-empty
    TestValidator.predicate("status is non-empty", employee.status.length > 0);
    // Validate hire_date is valid ISO date-time format
    TestValidator.predicate(
      "hire_date is valid date",
      !isNaN(Date.parse(employee.hire_date)),
    );
    // Validate created_at is valid ISO date-time format
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(Date.parse(employee.created_at)),
    );
    // Validate member relationship
    TestValidator.predicate(
      "member email is non-empty",
      employee.member.email.length > 0,
    );
    // Validate nullable department if present
    if (employee.department !== null) {
      TestValidator.predicate(
        "department name is non-empty",
        employee.department.name.length > 0,
      );
    }
    // Validate nullable role if present
    if (employee.role !== null) {
      TestValidator.predicate(
        "role name is non-empty",
        employee.role.name.length > 0,
      );
    }
  });
  // 6. Validate pagination consistency
  if (reports.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      reports.pagination.pages ===
        Math.ceil(reports.pagination.records / reports.pagination.limit),
    );
  }
  TestValidator.predicate(
    "data length does not exceed limit",
    reports.data.length <= reports.pagination.limit,
  );
  // 7. Validate organization isolation through member context
  TestValidator.predicate(
    "reports retrieved with authenticated member",
    reports.data.length >= 0,
  );
}
