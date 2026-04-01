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
 * Test the time report endpoint with project grouping and filtering to verify correct aggregation and filter application.
 *
 * **Setup:**
 * 1. Authenticate as a member using authorize_member_join
 * 2. Create 3 projects with distinct names for grouping verification
 * 3. Create timelogs across different projects with mixed billable statuses
 * 4. Use varying durations to enable sorting validation
 *
 * **Test Execution:**
 * 1. Query time report with group='project' and date range covering all timelogs
 * 2. Verify response contains entries for projects with logged time
 * 3. Validate total_hours per project matches sum of all timelog durations
 * 4. Apply projectIds filter to subset results
 * 5. Apply billable=true/false filters
 * 6. Test sorting by totalHours desc and name asc
 */
export async function test_api_time_report_group_by_project_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Set authorization token on connection
  memberConnection.headers = {
    Authorization: authResult.token.access,
  };
  // 2. Create 3 projects with distinct names
  const projectNames = [
    `Alpha Project ${RandomGenerator.alphabets(5)}`,
    `Beta Project ${RandomGenerator.alphabets(5)}`,
    `Gamma Project ${RandomGenerator.alphabets(5)}`,
  ];
  const projects: IHrmPlatformProject[] = [];
  for (const name of projectNames) {
    const project = await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name,
          color_code: "#FF5733",
          status: "active",
        },
      },
    );
    typia.assert(project);
    projects.push(project);
  }
  // 3. Create timelogs with varying durations and billable statuses
  // Use dates within a specific range for filtering
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 5); // 5 days ago
  const timelogs: IHrmPlatformTimelog[] = [];
  // Create timelogs for each project with different billable statuses
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    // Create 2 billable timelogs per project
    for (let j = 0; j < 2; j++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i + j);
      const timelog = await generate_random_hrm_platform_member_timelogs_create(
        memberConnection,
        {
          body: {
            date: date.toISOString(),
            durationMinutes: 60 + i * 30 + j * 15, // Varying durations: 60, 75, 90, 105, 120, 135
            projectId: project.id,
            description: `Billable work on ${project.name}`,
            billable: true,
          },
        },
      );
      typia.assert(timelog);
      timelogs.push(timelog);
    }
    // Create 1 non-billable timelog per project
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i + 2);
    const nonBillableTimelog =
      await generate_random_hrm_platform_member_timelogs_create(
        memberConnection,
        {
          body: {
            date: date.toISOString(),
            durationMinutes: 30 + i * 10, // Varying durations: 30, 40, 50
            projectId: project.id,
            description: `Non-billable work on ${project.name}`,
            billable: false,
          },
        },
      );
    typia.assert(nonBillableTimelog);
    timelogs.push(nonBillableTimelog);
  }
  // Calculate expected hours per project
  const expectedHoursByProject = new Map<
    string,
    {
      total: number;
      billable: number;
      nonBillable: number;
    }
  >();
  for (const timelog of timelogs) {
    const projectId = timelog.project.id;
    if (!expectedHoursByProject.has(projectId)) {
      expectedHoursByProject.set(projectId, {
        total: 0,
        billable: 0,
        nonBillable: 0,
      });
    }
    const hours = timelog.durationMinutes / 60;
    const entry = expectedHoursByProject.get(projectId)!;
    entry.total += hours;
    if (timelog.billable) {
      entry.billable += hours;
    } else {
      entry.nonBillable += hours;
    }
  }
  // 4. Query time report with group='project'
  const dateFrom = new Date(baseDate);
  dateFrom.setDate(dateFrom.getDate() - 1);
  const dateTo = new Date(baseDate);
  dateTo.setDate(dateTo.getDate() + 10);
  const reportRequest: IHrmPlatformTimeReport.IRequest = {
    dateFrom: dateFrom.toISOString().split("T")[0],
    dateTo: dateTo.toISOString().split("T")[0],
    group: "project",
    page: 1,
    limit: 10,
  };
  const report = await api.functional.hrmPlatform.member.reports.time.index(
    memberConnection,
    {
      body: reportRequest,
    },
  );
  typia.assert(report);
  // 5. Validate basic report structure
  TestValidator.predicate("report has data", report.data.length > 0);
  TestValidator.predicate(
    "pagination is valid",
    report.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    report.pagination.records >= 0,
  );
  // 6. Validate each report entry
  for (const entry of report.data) {
    TestValidator.equals("group type is project", entry.group_type, "project");
    TestValidator.predicate("project reference exists", entry.project !== null);
    TestValidator.predicate(
      "employee is null for project grouping",
      entry.employee === null,
    );
    TestValidator.predicate(
      "task is null for project grouping",
      entry.task === null,
    );
    // Validate hours calculation
    TestValidator.predicate(
      "total hours is non-negative",
      entry.total_hours >= 0,
    );
    TestValidator.predicate(
      "billable hours is non-negative",
      entry.billable_hours >= 0,
    );
    TestValidator.predicate(
      "non-billable hours is non-negative",
      entry.non_billable_hours >= 0,
    );
    // total_hours should equal billable + non_billable (with small tolerance for floating point)
    const sumHours = entry.billable_hours + entry.non_billable_hours;
    TestValidator.predicate(
      "total equals billable + non-billable",
      Math.abs(entry.total_hours - sumHours) < 0.01,
    );
  }
  // 7. Test projectIds filter - only return specific projects
  const filterProjectIds = [projects[0].id, projects[1].id];
  const filteredReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          ...reportRequest,
          projectIds: filterProjectIds,
        },
      },
    );
  typia.assert(filteredReport);
  // Verify only filtered projects are in results
  for (const entry of filteredReport.data) {
    TestValidator.predicate(
      "filtered project is in allowed list",
      entry.project !== null && filterProjectIds.includes(entry.project.id),
    );
  }
  // 8. Test billable=true filter
  const billableReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          ...reportRequest,
          billable: true,
        },
      },
    );
  typia.assert(billableReport);
  // Verify only billable hours are counted
  for (const entry of billableReport.data) {
    TestValidator.predicate(
      "non-billable hours should be 0 when billable=true",
      entry.non_billable_hours === 0,
    );
    TestValidator.predicate(
      "billable hours should be positive",
      entry.billable_hours > 0,
    );
    TestValidator.equals(
      "total equals billable when billable=true",
      entry.total_hours,
      entry.billable_hours,
    );
  }
  // 9. Test billable=false filter
  const nonBillableReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          ...reportRequest,
          billable: false,
        },
      },
    );
  typia.assert(nonBillableReport);
  // Verify only non-billable hours are counted
  for (const entry of nonBillableReport.data) {
    TestValidator.predicate(
      "billable hours should be 0 when billable=false",
      entry.billable_hours === 0,
    );
    TestValidator.predicate(
      "non-billable hours should be positive",
      entry.non_billable_hours > 0,
    );
    TestValidator.equals(
      "total equals non-billable when billable=false",
      entry.total_hours,
      entry.non_billable_hours,
    );
  }
  // 10. Test sorting by totalHours desc
  const sortedDescReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          ...reportRequest,
          sort: "totalHours",
          direction: "desc",
        },
      },
    );
  typia.assert(sortedDescReport);
  // Verify descending order
  for (let i = 0; i < sortedDescReport.data.length - 1; i++) {
    TestValidator.predicate(
      "totalHours sorted descending",
      sortedDescReport.data[i].total_hours >=
        sortedDescReport.data[i + 1].total_hours,
    );
  }
  // 11. Test sorting by name asc
  const sortedNameReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          ...reportRequest,
          sort: "name",
          direction: "asc",
        },
      },
    );
  typia.assert(sortedNameReport);
  // Verify ascending alphabetical order
  for (let i = 0; i < sortedNameReport.data.length - 1; i++) {
    const currentName = sortedNameReport.data[i].project?.name ?? "";
    const nextName = sortedNameReport.data[i + 1].project?.name ?? "";
    TestValidator.predicate(
      "name sorted ascending",
      currentName.localeCompare(nextName) <= 0,
    );
  }
}
