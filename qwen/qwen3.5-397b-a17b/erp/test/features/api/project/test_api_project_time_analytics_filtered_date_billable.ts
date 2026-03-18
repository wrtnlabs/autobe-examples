import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformProjectTimeAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeAnalytic";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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

export async function test_api_project_time_analytics_filtered_date_billable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create organization context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee record for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.member.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create timelogs with different dates and billable statuses
  // Date range for filtering: 2024-01-15 to 2024-01-20
  const filterFromDate = "2024-01-15";
  const filterToDate = "2024-01-20";
  // Timelog 1: Within date range, billable=true (120 minutes) - SHOULD BE INCLUDED
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date("2024-01-16T10:00:00.000Z").toISOString(),
        duration_minutes: 120,
        billable: true,
        description: "Billable work within range",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: Within date range, billable=false (90 minutes) - SHOULD BE EXCLUDED by billable filter
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date("2024-01-17T10:00:00.000Z").toISOString(),
        duration_minutes: 90,
        billable: false,
        description: "Non-billable work within range",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: Within date range, billable=true (180 minutes) - SHOULD BE INCLUDED
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date("2024-01-18T10:00:00.000Z").toISOString(),
        duration_minutes: 180,
        billable: true,
        description: "Another billable work within range",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Outside date range before (2024-01-10), billable=true (60 minutes) - SHOULD BE EXCLUDED by date filter
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date("2024-01-10T10:00:00.000Z").toISOString(),
        duration_minutes: 60,
        billable: true,
        description: "Billable work before range",
      },
    },
  );
  typia.assert(timelog4);
  // Timelog 5: Outside date range after (2024-01-25), billable=true (150 minutes) - SHOULD BE EXCLUDED by date filter
  const timelog5 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date("2024-01-25T10:00:00.000Z").toISOString(),
        duration_minutes: 150,
        billable: true,
        description: "Billable work after range",
      },
    },
  );
  typia.assert(timelog5);
  // 7. Call analytics endpoint with date range and billable filter
  const analytics =
    await api.functional.hrmPlatform.member.projects.analytics.time.analyticsTime(
      memberConnection,
      {
        projectId: project.id,
        body: {
          fromDate: filterFromDate,
          toDate: filterToDate,
          billable: true,
        },
      },
    );
  typia.assert(analytics);
  // 8. Validate analytics results
  // Expected: Only timelog1 (120 min) + timelog3 (180 min) = 300 minutes = 5 hours
  TestValidator.equals(
    "total minutes matches filtered billable timelogs",
    analytics.totalMinutes,
    300,
  );
  TestValidator.equals(
    "total hours matches filtered billable timelogs",
    analytics.totalHours,
    5,
  );
  // Billable breakdown should show nonBillableMinutes as 0 since filter excludes non-billable
  TestValidator.equals(
    "billable minutes",
    analytics.billableBreakdown.billableMinutes,
    300,
  );
  TestValidator.predicate(
    "non-billable minutes should be 0",
    analytics.billableBreakdown.nonBillableMinutes === 0,
  );
  // Date range should reflect only filtered timelogs (2024-01-16 to 2024-01-18)
  TestValidator.equals(
    "from date reflects earliest filtered timelog",
    analytics.dateRange.fromDate,
    "2024-01-16",
  );
  TestValidator.equals(
    "to date reflects latest filtered timelog",
    analytics.dateRange.toDate,
    "2024-01-18",
  );
  // Employee breakdown should contain entries from filtered timelogs
  TestValidator.predicate(
    "employee breakdown has entries",
    analytics.employeeBreakdown.length > 0,
  );
  TestValidator.predicate(
    "employee breakdown total matches",
    analytics.employeeBreakdown.some((e) => e.totalMinutes === 300),
  );
  // Task breakdown should exist (may include unassigned if no task specified)
  TestValidator.predicate(
    "task breakdown is array",
    Array.isArray(analytics.taskBreakdown),
  );
  // Daily breakdown should have entries for each day with billable timelogs (Jan 16 and Jan 18)
  TestValidator.predicate(
    "daily breakdown has entries",
    analytics.dailyBreakdown.length > 0,
  );
  const dailyTotal = analytics.dailyBreakdown.reduce(
    (sum, day) => sum + day.totalMinutes,
    0,
  );
  TestValidator.equals("daily breakdown total matches", dailyTotal, 300);
}
