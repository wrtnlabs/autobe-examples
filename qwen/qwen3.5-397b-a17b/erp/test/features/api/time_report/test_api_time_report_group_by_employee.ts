import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the time report endpoint with employee grouping to verify aggregated hours calculation.
 *
 * This test validates:
 * 1. Employee grouping correctly aggregates timelogs by employee
 * 2. Total hours calculation is accurate (sum of all timelog durations in hours)
 * 3. Billable hours include only timelogs where billable=true
 * 4. Non-billable hours include only timelogs where billable=false
 * 5. total_hours = billable_hours + non_billable_hours for each employee
 */
export async function test_api_time_report_group_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create main member (test organizer)
  const mainConnection: api.IConnection = { host: connection.host };
  const mainAuth = await authorize_member_join(mainConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(mainAuth);
  // 2. Create a project for timelog assignment
  const project = await generate_random_hrm_platform_member_projects_create(
    mainConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create invitations for additional employees
  const employee1Email = typia.random<string & tags.Format<"email">>();
  const employee2Email = typia.random<string & tags.Format<"email">>();
  const invitation1 =
    await generate_random_hrm_platform_member_invitations_create(
      mainConnection,
      {
        body: {
          email: employee1Email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation1);
  const invitation2 =
    await generate_random_hrm_platform_member_invitations_create(
      mainConnection,
      {
        body: {
          email: employee2Email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation2);
  // 4. Accept invitations by joining with invited emails
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Auth = await authorize_member_join(employee1Connection, {
    body: {
      email: employee1Email,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee1Auth);
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Auth = await authorize_member_join(employee2Connection, {
    body: {
      email: employee2Email,
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employee2Auth);
  // 5. Assign employees to project as project members and get employee IDs from response
  const projectMember1 =
    await generate_random_hrm_platform_member_projects_members_create(
      mainConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee1Auth.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember1);
  const employee1Id = projectMember1.employee.id;
  const projectMember2 =
    await generate_random_hrm_platform_member_projects_members_create(
      mainConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: employee2Auth.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember2);
  const employee2Id = projectMember2.employee.id;
  // 6. Create timelogs for different employees with varying durations and billable statuses
  const testDate = new Date();
  const testDateStr = testDate.toISOString();
  // Employee 1: 2 billable timelogs (60 min + 90 min = 150 min = 2.5 hours)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    employee1Connection,
    {
      body: {
        date: testDateStr,
        durationMinutes: 60,
        projectId: project.id,
        billable: true,
        description: "Billable work session 1",
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    employee1Connection,
    {
      body: {
        date: testDateStr,
        durationMinutes: 90,
        projectId: project.id,
        billable: true,
        description: "Billable work session 2",
      },
    },
  );
  typia.assert(timelog2);
  // Employee 2: 1 billable (45 min) + 1 non-billable (30 min) = 75 min = 1.25 hours
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    employee2Connection,
    {
      body: {
        date: testDateStr,
        durationMinutes: 45,
        projectId: project.id,
        billable: true,
        description: "Billable work session",
      },
    },
  );
  typia.assert(timelog3);
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    employee2Connection,
    {
      body: {
        date: testDateStr,
        durationMinutes: 30,
        projectId: project.id,
        billable: false,
        description: "Non-billable work session",
      },
    },
  );
  typia.assert(timelog4);
  // 7. Query time report with group='employee'
  const dateFrom = new Date(testDate.getTime() - 1 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dateTo = new Date(testDate.getTime() + 1 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const report = await api.functional.hrmPlatform.member.reports.time.index(
    mainConnection,
    {
      body: {
        dateFrom,
        dateTo,
        group: "employee",
      } satisfies IHrmPlatformTimeReport.IRequest,
    },
  );
  typia.assert(report);
  // 8. Validate response structure
  TestValidator.predicate("report has data", report.data.length > 0);
  TestValidator.predicate("pagination exists", report.pagination !== undefined);
  // 9. Find employee entries in report by employee ID
  const employee1Entry = report.data.find(
    (entry) => entry.employee?.id === employee1Id,
  );
  const employee2Entry = report.data.find(
    (entry) => entry.employee?.id === employee2Id,
  );
  TestValidator.predicate("employee 1 in report", employee1Entry !== undefined);
  TestValidator.predicate("employee 2 in report", employee2Entry !== undefined);
  // 10. Validate employee 1 hours (150 minutes = 2.5 hours, all billable)
  if (employee1Entry) {
    TestValidator.equals(
      "employee 1 total hours",
      employee1Entry.total_hours,
      2.5,
    );
    TestValidator.equals(
      "employee 1 billable hours",
      employee1Entry.billable_hours,
      2.5,
    );
    TestValidator.equals(
      "employee 1 non-billable hours",
      employee1Entry.non_billable_hours,
      0,
    );
    TestValidator.predicate(
      "employee 1 hours balance",
      Math.abs(
        employee1Entry.total_hours -
          (employee1Entry.billable_hours + employee1Entry.non_billable_hours),
      ) < 0.01,
    );
    TestValidator.equals(
      "employee 1 group type",
      employee1Entry.group_type,
      "employee",
    );
    TestValidator.predicate(
      "employee 1 has employee reference",
      employee1Entry.employee !== null,
    );
    TestValidator.equals(
      "employee 1 project is null",
      employee1Entry.project,
      null,
    );
    TestValidator.equals("employee 1 task is null", employee1Entry.task, null);
  }
  // 11. Validate employee 2 hours (75 minutes = 1.25 hours, 0.75 billable + 0.5 non-billable)
  if (employee2Entry) {
    TestValidator.equals(
      "employee 2 total hours",
      employee2Entry.total_hours,
      1.25,
    );
    TestValidator.equals(
      "employee 2 billable hours",
      employee2Entry.billable_hours,
      0.75,
    );
    TestValidator.equals(
      "employee 2 non-billable hours",
      employee2Entry.non_billable_hours,
      0.5,
    );
    TestValidator.predicate(
      "employee 2 hours balance",
      Math.abs(
        employee2Entry.total_hours -
          (employee2Entry.billable_hours + employee2Entry.non_billable_hours),
      ) < 0.01,
    );
    TestValidator.equals(
      "employee 2 group type",
      employee2Entry.group_type,
      "employee",
    );
    TestValidator.predicate(
      "employee 2 has employee reference",
      employee2Entry.employee !== null,
    );
    TestValidator.equals(
      "employee 2 project is null",
      employee2Entry.project,
      null,
    );
    TestValidator.equals("employee 2 task is null", employee2Entry.task, null);
  }
  // 12. Validate employee display names match auth response
  if (employee1Entry?.employee) {
    TestValidator.equals(
      "employee 1 display name matches",
      employee1Entry.employee.user.display_name,
      employee1Auth.display_name,
    );
  }
  if (employee2Entry?.employee) {
    TestValidator.equals(
      "employee 2 display name matches",
      employee2Entry.employee.user.display_name,
      employee2Auth.display_name,
    );
  }
}
