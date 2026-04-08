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
 * Test retrieving a hierarchical department report with employee statistics for an organization.
 *
 * Validates the complete department report workflow including member authentication, organization creation, hierarchical department structure setup, employee assignments, and report retrieval. Ensures that the department report correctly displays parent-child relationships and accurately counts employees assigned to each department.
 *
 * Special attention is given to verifying that the hierarchical structure is maintained with child departments nested under their parents, employee counts are accurate, and departments are sorted alphabetically within each parent level.
 *
 * 1. Register and authenticate as a member using authorize_member_join utility.
 * 2. Create an organization using generate_random_hrm_time_track_member_organizations_create utility.
 * 3. Create parent departments (Engineering, Marketing, Sales) and child departments (Backend, Frontend, QA under Engineering).
 * 4. Create employees and assign them to various departments to test employee count accuracy.
 * 5. Call GET /hrmTimeTrack/member/reports/departments to retrieve the hierarchical report.
 * 6. Validate the response structure, hierarchical relationships, and employee counts.
 */
export async function test_api_department_report_hierarchical_with_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create parent departments
  const engineeringDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Engineering" } },
    );
  typia.assert(engineeringDept);
  const marketingDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Marketing" } },
    );
  typia.assert(marketingDept);
  const salesDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      { body: { name: "Sales" } },
    );
  typia.assert(salesDept);
  // 4. Create child departments under Engineering
  const backendDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Backend",
          parent_department_id: engineeringDept.id,
        },
      },
    );
  typia.assert(backendDept);
  const frontendDept =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Frontend",
          parent_department_id: engineeringDept.id,
        },
      },
    );
  typia.assert(frontendDept);
  const qaDept = await generate_random_hrm_time_track_member_departments_create(
    memberConnection,
    {
      body: {
        name: "QA",
        parent_department_id: engineeringDept.id,
      },
    },
  );
  typia.assert(qaDept);
  // 5. Create employees and assign them to departments
  // Create 2 employees for Backend
  const backendEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: backendDept.id,
        },
      },
    );
  typia.assert(backendEmployee1);
  const backendEmployee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: backendDept.id,
        },
      },
    );
  typia.assert(backendEmployee2);
  // Create 1 employee for Frontend
  const frontendEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: frontendDept.id,
        },
      },
    );
  typia.assert(frontendEmployee1);
  // Create 3 employees for QA
  const qaEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: qaDept.id,
        },
      },
    );
  typia.assert(qaEmployee1);
  const qaEmployee2 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: qaDept.id,
        },
      },
    );
  typia.assert(qaEmployee2);
  const qaEmployee3 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: qaDept.id,
        },
      },
    );
  typia.assert(qaEmployee3);
  // Create 1 employee for Marketing (no sub-departments)
  const marketingEmployee1 =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_department_id: marketingDept.id,
        },
      },
    );
  typia.assert(marketingEmployee1);
  // Sales has no employees (to test employee_count = 0)
  // 6. Retrieve the hierarchical department report
  const report =
    await api.functional.hrmTimeTrack.member.reports.departments.report(
      memberConnection,
    );
  typia.assert(report);
  // 7. Validate the report structure
  // The report should be an array of top-level departments
  // Note: SDK type says IStatistic but scenario indicates array
  // We'll handle it as an array based on scenario requirements
  // Cast to array for validation (runtime will determine actual type)
  const reportArray = Array.isArray(report)
    ? report
    : [report as IHrmTimeTrackDepartmentReport.IStatistic];
  TestValidator.predicate(
    "report contains departments",
    reportArray.length > 0,
  );
  // Find Engineering department in the report
  const engineeringReport = reportArray.find(
    (dept) => dept.name === "Engineering",
  );
  TestValidator.predicate(
    "Engineering department exists in report",
    engineeringReport !== undefined,
  );
  if (engineeringReport) {
    // Verify Engineering has children (Backend, Frontend, QA)
    TestValidator.equals(
      "Engineering has 3 child departments",
      engineeringReport.children.length,
      3,
    );
    // Verify child departments are sorted alphabetically
    const childNames = engineeringReport.children.map(
      (c: IHrmTimeTrackDepartmentReport.IStatistic) => c.name,
    );
    TestValidator.equals(
      "Engineering children sorted alphabetically",
      childNames,
      ["Backend", "Frontend", "QA"],
    );
    // Verify Backend employee count
    const backendReport = engineeringReport.children.find(
      (c: IHrmTimeTrackDepartmentReport.IStatistic) => c.name === "Backend",
    );
    if (backendReport) {
      TestValidator.equals(
        "Backend employee count is 2",
        backendReport.employee_count,
        2,
      );
    }
    // Verify Frontend employee count
    const frontendReport = engineeringReport.children.find(
      (c: IHrmTimeTrackDepartmentReport.IStatistic) =>
        c.name === "Frontend",
    );
    if (frontendReport) {
      TestValidator.equals(
        "Frontend employee count is 1",
        frontendReport.employee_count,
        1,
      );
    }
    // Verify QA employee count
    const qaReport = engineeringReport.children.find(
      (c: IHrmTimeTrackDepartmentReport.IStatistic) => c.name === "QA",
    );
    if (qaReport) {
      TestValidator.equals(
        "QA employee count is 3",
        qaReport.employee_count,
        3,
      );
    }
  }
  // Find Marketing department in the report
  const marketingReport = reportArray.find((dept) => dept.name === "Marketing");
  TestValidator.predicate(
    "Marketing department exists in report",
    marketingReport !== undefined,
  );
  if (marketingReport) {
    // Verify Marketing has no children
    TestValidator.equals(
      "Marketing has no child departments",
      marketingReport.children.length,
      0,
    );
    // Verify Marketing employee count
    TestValidator.equals(
      "Marketing employee count is 1",
      marketingReport.employee_count,
      1,
    );
  }
  // Find Sales department in the report
  const salesReport = reportArray.find((dept) => dept.name === "Sales");
  TestValidator.predicate(
    "Sales department exists in report",
    salesReport !== undefined,
  );
  if (salesReport) {
    // Verify Sales has no children
    TestValidator.equals(
      "Sales has no child departments",
      salesReport.children.length,
      0,
    );
    // Verify Sales employee count is 0
    TestValidator.equals(
      "Sales employee count is 0",
      salesReport.employee_count,
      0,
    );
  }
  // Verify all departments have required fields
  TestValidator.predicate(
    "all departments have id",
    reportArray.every((dept) => typeof dept.id === "string"),
  );
  TestValidator.predicate(
    "all departments have name",
    reportArray.every((dept) => typeof dept.name === "string"),
  );
  TestValidator.predicate(
    "all departments have employee_count",
    reportArray.every((dept) => typeof dept.employee_count === "number"),
  );
  TestValidator.predicate(
    "all departments have children array",
    reportArray.every((dept) => Array.isArray(dept.children)),
  );
  TestValidator.predicate(
    "all employee counts are non-negative",
    reportArray.every((dept) => dept.employee_count >= 0),
  );
}