import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
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
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";

/**
 * Test that soft-deleted (deactivated) employees are excluded from employee reports.
 *
 * Validates that when an employee's status is changed to deactivated, they do not appear in the paginated employee list retrieved from the reports endpoint. This ensures the query filter correctly excludes records where status is 'deactivated'.
 *
 * 1. Authenticate as member to access employee reports and management features.
 * 2. Create an active employee record with random employment details.
 * 3. Fetch employee reports and verify the active employee appears in the list.
 * 4. Update the employee's status to 'deactivated'.
 * 5. Fetch employee reports again and verify the deactivated employee is excluded from the list.
 * 6. Validate that the exclusion filter works correctly by comparing employee IDs.
 */
export async function test_api_employee_reports_deactivated_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an active employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Fetch employee reports and verify active employee appears
  const reportsBefore =
    await api.functional.hrmTimeTrack.member.reports.employees.report(
      memberConnection,
    );
  typia.assert(reportsBefore);
  const activeEmployeeFound = reportsBefore.data.some(
    (emp) => emp.id === employee.id,
  );
  TestValidator.predicate(
    "active employee must appear in reports",
    activeEmployeeFound,
  );
  // 4. Update employee status to deactivated
  const updateBody = {
    status: "deactivated",
  } satisfies IHrmTimeTrackEmployee.IUpdate;
  await api.functional.hrmTimeTrack.member.employees.update(memberConnection, {
    employeeId: employee.id,
    body: updateBody,
  });
  // 5. Fetch employee reports again and verify deactivated employee is excluded
  const reportsAfter =
    await api.functional.hrmTimeTrack.member.reports.employees.report(
      memberConnection,
    );
  typia.assert(reportsAfter);
  const deactivatedEmployeeFound = reportsAfter.data.some(
    (emp) => emp.id === employee.id,
  );
  TestValidator.predicate(
    "deactivated employee must be excluded from reports",
    !deactivatedEmployeeFound,
  );
  // 6. Validate employee count decreased or stayed same (if only one employee)
  TestValidator.predicate(
    "employee count should not increase after deactivation",
    reportsAfter.data.length <= reportsBefore.data.length,
  );
}
