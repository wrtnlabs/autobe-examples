import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackDepartmentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartmentReport";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test retrieving a department report when some departments have been soft-deleted.
 *
 * Validates that the department report endpoint correctly excludes soft-deleted departments from the hierarchical report. The test creates multiple departments with employees, deletes one department, and verifies that only active departments appear in the report with accurate employee counts.
 *
 * This test ensures that soft-deleted departments are properly filtered out from reports while preserving employee records and their data integrity.
 *
 * 1. Register and authenticate as a member
 * 2. Create an organization
 * 3. Create three departments: Engineering, Sales, and Marketing
 * 4. Create employees and assign them to each department
 * 5. Soft-delete the Marketing department
 * 6. Retrieve the department report and verify only active departments are included
 * 7. Validate employee counts match the expected values for remaining departments
 */
export async function test_api_department_report_with_deleted_department(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection);
  typia.assert(memberAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create three departments: Engineering, Sales, and Marketing
  const engineeringDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Engineering" } },
    );
  typia.assert(engineeringDept);
  const salesDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Sales" } },
    );
  typia.assert(salesDept);
  const marketingDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Marketing" } },
    );
  typia.assert(marketingDept);
  // 4. Create employees and assign them to each department
  const engineeringEmployees: IHrmTimeTrackEmployee[] =
    await ArrayUtil.asyncRepeat(3, async (index) =>
      generate_random_hrm_time_track_member_employees_create(memberConnection, {
        body: {
          position: `Engineer ${index + 1}`,
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          hrm_time_track_department_id: engineeringDept.id,
          hrm_time_track_member_id: memberAuth.id,
        },
      }),
    );
  await ArrayUtil.asyncForEach(engineeringEmployees, async (emp) =>
    typia.assert(emp),
  );
  const salesEmployees: IHrmTimeTrackEmployee[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) =>
      generate_random_hrm_time_track_member_employees_create(memberConnection, {
        body: {
          position: `Sales Rep ${index + 1}`,
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          hrm_time_track_department_id: salesDept.id,
          hrm_time_track_member_id: memberAuth.id,
        },
      }),
  );
  await ArrayUtil.asyncForEach(salesEmployees, async (emp) => typia.assert(emp));
  const marketingEmployees: IHrmTimeTrackEmployee[] =
    await ArrayUtil.asyncRepeat(2, async (index) =>
      generate_random_hrm_time_track_member_employees_create(memberConnection, {
        body: {
          position: `Marketing Specialist ${index + 1}`,
          employment_type: "full-time",
          hire_date: new Date().toISOString(),
          hrm_time_track_department_id: marketingDept.id,
          hrm_time_track_member_id: memberAuth.id,
        },
      }),
    );
  await ArrayUtil.asyncForEach(marketingEmployees, async (emp) => typia.assert(emp));
  // 5. Soft-delete the Marketing department
  await api.functional.hrmTimeTrack.member.departments.erase(memberConnection, {
    departmentId: marketingDept.id,
  });
  // 6. Retrieve the department report
  const report =
    await api.functional.hrmTimeTrack.member.reports.departments.report(
      memberConnection,
    );
  typia.assert(report);
  // 7. Verify only active departments are included (Engineering and Sales)
  const activeDepartmentNames = getAllDepartmentNames(report);
  TestValidator.equals(
    "active departments count",
    activeDepartmentNames.length,
    2,
  );
  TestValidator.predicate(
    "Engineering department exists",
    activeDepartmentNames.includes("Engineering"),
  );
  TestValidator.predicate(
    "Sales department exists",
    activeDepartmentNames.includes("Sales"),
  );
  TestValidator.predicate(
    "Marketing department is excluded",
    !activeDepartmentNames.includes("Marketing"),
  );
  // 8. Validate employee counts for remaining departments
  const engineeringStat = findDepartmentByName(report, "Engineering");
  const salesStat = findDepartmentByName(report, "Sales");
  TestValidator.equals(
    "Engineering employee count",
    engineeringStat?.employee_count,
    3,
  );
  TestValidator.equals("Sales employee count", salesStat?.employee_count, 2);
}
/**
 * Recursively collects all department names from the hierarchical report.
 */
function getAllDepartmentNames(
  report: IHrmTimeTrackDepartmentReport.IStatistic,
): string[] {
  const names: string[] = [report.name];
  for (const child of report.children) {
    names.push(...getAllDepartmentNames(child));
  }
  return names;
}
/**
 * Recursively finds a department by name in the hierarchical report.
 */
function findDepartmentByName(
  report: IHrmTimeTrackDepartmentReport.IStatistic,
  name: string,
): IHrmTimeTrackDepartmentReport.IStatistic | null {
  if (report.name === name) return report;
  for (const child of report.children) {
    const found = findDepartmentByName(child, name);
    if (found) return found;
  }
  return null;
}