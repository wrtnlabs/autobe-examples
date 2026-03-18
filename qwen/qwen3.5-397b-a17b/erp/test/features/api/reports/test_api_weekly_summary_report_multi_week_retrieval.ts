import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformWeeklySummaryReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test the weekly summary report retrieval with multiple weeks of timelog data.
 * 1. Authenticate as member with report:view permission
 * 2. Create organization context
 * 3. Create multiple employees to log time
 * 4. Create project for timelog assignment
 * 5. Assign employees to project as project members
 * 6. Generate timelogs spanning multiple weeks with varying durations
 * 7. Query weekly summary endpoint without date filters
 * 8. Verify week boundaries (Monday-Sunday), total hours, timelog counts, employee counts
 * 9. Validate pagination metadata and descending chronological order
 */
export async function test_api_weekly_summary_report_multi_week_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create multiple employees (3 employees for testing)
  const employees = await ArrayUtil.asyncRepeat(3, async (index) => {
    // First employee is the member themselves
    if (index === 0) {
      return await generate_random_hrm_platform_member_employees_create(
        memberConnection,
        {
          body: {
            member_id: memberAuth.id,
            role_id: organization.owner.id,
            employment_type: "full-time",
            status: "active",
          } satisfies IHrmPlatformEmployee.ICreate,
        },
      );
    }
    // Other employees need new members
    const newMember = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
    typia.assert(newMember);
    return await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: newMember.id,
          role_id: organization.owner.id,
          employment_type: "full-time",
          status: "active",
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  });
  TestValidator.predicate("3 employees created", employees.length === 3);
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign all employees to project
  await ArrayUtil.asyncForEach(employees, async (employee) => {
    const projectMember =
      await generate_random_hrm_platform_member_projects_members_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            hrm_platform_employee_id: employee.id,
            role: "member",
          } satisfies IHrmPlatformProjectMember.ICreate,
        },
      );
    typia.assert(projectMember);
  });
  // 6. Create timelogs spanning multiple weeks (4 weeks of data)
  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const timelogs = await ArrayUtil.asyncRepeat(12, async (index) => {
    // Create timelogs spread across 4 weeks (3 timelogs per week)
    const weeksBack = Math.floor(index / 3); // 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3
    const employeeIndex = index % 3; // Rotate through employees
    const date = new Date(
      now.getTime() - weeksBack * oneWeek - (index % 3) * 24 * 60 * 60 * 1000,
    );
    return await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: date.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
          >() satisfies number as number,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  });
  TestValidator.predicate("12 timelogs created", timelogs.length === 12);
  // 7. Query weekly summary endpoint without date filters
  const weeklySummary =
    await api.functional.hrmPlatform.member.reports.weekly_summary.search(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformWeeklySummaryReport.IRequest,
      },
    );
  typia.assert(weeklySummary);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    weeklySummary.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    weeklySummary.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", weeklySummary.pagination.limit === 10);
  TestValidator.predicate("has data", weeklySummary.data.length > 0);
  // 9. Validate week data structure and ordering
  TestValidator.predicate("weeks returned", weeklySummary.data.length > 0);
  // Verify weeks are in descending order (most recent first)
  if (weeklySummary.data.length > 1) {
    for (let i = 0; i < weeklySummary.data.length - 1; i++) {
      const currentWeek = weeklySummary.data[i];
      const nextWeek = weeklySummary.data[i + 1];
      TestValidator.predicate(
        `week ${i} is before week ${i + 1}`,
        currentWeek.weekStart > nextWeek.weekStart,
      );
    }
  }
  // 10. Validate each week summary has correct structure
  await ArrayUtil.asyncForEach(weeklySummary.data, async (week, index) => {
    TestValidator.predicate(
      `week ${index} has weekStart`,
      week.weekStart !== undefined && week.weekStart !== null,
    );
    TestValidator.predicate(
      `week ${index} has weekEnd`,
      week.weekEnd !== undefined && week.weekEnd !== null,
    );
    TestValidator.predicate(
      `week ${index} has totalHours`,
      week.totalHours !== undefined && week.totalHours >= 0,
    );
    TestValidator.predicate(
      `week ${index} has timelogCount`,
      week.timelogCount !== undefined && week.timelogCount >= 0,
    );
    TestValidator.predicate(
      `week ${index} has employeeCount`,
      week.employeeCount !== undefined && week.employeeCount >= 0,
    );
    // Verify week boundaries are Monday-Sunday (7 days apart)
    const startDate = new Date(week.weekStart);
    const endDate = new Date(week.weekEnd);
    const dayDifference = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    TestValidator.predicate(
      `week ${index} is 7 days`,
      dayDifference === 6, // Monday to Sunday is 6 days difference
    );
  });
  // 11. Validate total hours calculation across all timelogs
  const totalDurationMinutes = timelogs.reduce(
    (sum, timelog) => sum + timelog.duration_minutes,
    0,
  );
  const expectedTotalHours = totalDurationMinutes / 60;
  const actualTotalHours = weeklySummary.data.reduce(
    (sum, week) => sum + week.totalHours,
    0,
  );
  TestValidator.predicate(
    "total hours match timelog durations",
    Math.abs(actualTotalHours - expectedTotalHours) < 0.01,
  );
  // 12. Validate timelog count
  const totalTimelogCount = weeklySummary.data.reduce(
    (sum, week) => sum + week.timelogCount,
    0,
  );
  TestValidator.equals(
    "timelog count matches created timelogs",
    totalTimelogCount,
    timelogs.length,
  );
  // 13. Validate employee count per week (should be 1-3 employees per week based on our distribution)
  await ArrayUtil.asyncForEach(weeklySummary.data, async (week, index) => {
    TestValidator.predicate(
      `week ${index} has at least 1 employee`,
      week.employeeCount >= 1,
    );
    TestValidator.predicate(
      `week ${index} has max 3 employees`,
      week.employeeCount <= 3,
    );
  });
}
