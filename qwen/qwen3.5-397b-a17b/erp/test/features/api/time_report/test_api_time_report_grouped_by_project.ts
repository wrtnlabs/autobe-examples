import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test generating a time tracking report grouped by project with billable/non-billable breakdown.
 *
 * Validates the complete time report generation flow including member authentication, organization setup, project creation, timelog distribution across projects, and report aggregation by project dimension. Ensures that the report correctly groups timelogs by project with accurate billable and non-billable minute calculations.
 *
 * Special attention is given to verifying that projects without timelogs in the date range are excluded from the report, while projects with null budget_hours are still included when they have timelogs. The test also validates that employee and task fields are null when grouping by project.
 *
 * 1. Member registers and authenticates (automatically becomes organization owner).
 * 2. Organization is created with owner role having full permissions.
 * 3. Two projects are created with different budget_hours values (one with budget, one without).
 * 4. Timelogs are created distributed across both projects with mixed billable status.
 * 5. Time report is generated grouped by project with date range covering all timelogs.
 * 6. Validates report structure, project grouping, and minute calculations.
 */
export async function test_api_time_report_grouped_by_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header for subsequent calls
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create organization (member becomes owner automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create two projects with different budget_hours
  const project1Budget = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<500>
  >();
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#FF5733",
        budgetHours: project1Budget,
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#33FF57",
        budgetHours: null,
      },
    },
  );
  typia.assert(project2);
  // 4. Create timelogs distributed across projects with mixed billable status
  const testDate = new Date();
  const dateStr = testDate.toISOString().split("T")[0];
  // Timelogs for project1 (2 billable, 1 non-billable)
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: `${dateStr}T09:00:00.000Z`,
        duration_minutes: 60,
        hrm_platform_project_id: project1.id,
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: `${dateStr}T11:00:00.000Z`,
        duration_minutes: 90,
        hrm_platform_project_id: project1.id,
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: `${dateStr}T14:00:00.000Z`,
        duration_minutes: 30,
        hrm_platform_project_id: project1.id,
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // Timelogs for project2 (1 billable, 1 non-billable)
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: `${dateStr}T10:00:00.000Z`,
        duration_minutes: 120,
        hrm_platform_project_id: project2.id,
        billable: true,
      },
    },
  );
  typia.assert(timelog4);
  const timelog5 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: `${dateStr}T15:00:00.000Z`,
        duration_minutes: 45,
        hrm_platform_project_id: project2.id,
        billable: false,
      },
    },
  );
  typia.assert(timelog5);
  // 5. Generate time report grouped by project
  const reportRequest: IHrmPlatformTimeReport.IRequest = {
    dateFrom: dateStr,
    dateTo: dateStr,
    groupBy: "project",
  };
  const report = await api.functional.hrmPlatform.member.reports.time.search(
    memberConnection,
    {
      body: reportRequest,
    },
  );
  typia.assert(report);
  // 6. Validate report structure and calculations
  // The API returns IHrmPlatformTimeReport.ISummary (single object or array depending on pagination)
  const reportData = Array.isArray(report) ? report : [report];
  TestValidator.equals("report contains 2 projects", reportData.length, 2);
  // Find project rows
  const project1Row = reportData.find((row) => row.project?.id === project1.id);
  const project2Row = reportData.find((row) => row.project?.id === project2.id);
  TestValidator.predicate(
    "project1 row exists",
    () => project1Row !== undefined,
  );
  TestValidator.predicate(
    "project2 row exists",
    () => project2Row !== undefined,
  );
  if (project1Row && project2Row) {
    // Validate project1: 60 + 90 + 30 = 180 total, 150 billable, 30 non-billable
    TestValidator.equals(
      "project1 total minutes",
      project1Row.total_minutes,
      180,
    );
    TestValidator.equals(
      "project1 billable minutes",
      project1Row.billable_minutes,
      150,
    );
    TestValidator.equals(
      "project1 non-billable minutes",
      project1Row.non_billable_minutes,
      30,
    );
    TestValidator.equals(
      "project1 has project info",
      project1Row.project?.id,
      project1.id,
    );
    TestValidator.equals(
      "project1 employee is null",
      project1Row.employee,
      null,
    );
    TestValidator.equals("project1 task is null", project1Row.task, null);
    // Validate project2: 120 + 45 = 165 total, 120 billable, 45 non-billable
    TestValidator.equals(
      "project2 total minutes",
      project2Row.total_minutes,
      165,
    );
    TestValidator.equals(
      "project2 billable minutes",
      project2Row.billable_minutes,
      120,
    );
    TestValidator.equals(
      "project2 non-billable minutes",
      project2Row.non_billable_minutes,
      45,
    );
    TestValidator.equals(
      "project2 has project info",
      project2Row.project?.id,
      project2.id,
    );
    TestValidator.equals(
      "project2 employee is null",
      project2Row.employee,
      null,
    );
    TestValidator.equals("project2 task is null", project2Row.task, null);
    // Validate project summary fields
    TestValidator.equals(
      "project1 name matches",
      project1Row.project?.name,
      project1.name,
    );
    TestValidator.equals(
      "project1 color matches",
      project1Row.project?.color,
      project1.color,
    );
    TestValidator.equals(
      "project1 status is active",
      project1Row.project?.status,
      "active",
    );
    TestValidator.equals(
      "project2 budget_hours is null",
      project2Row.project?.budget_hours,
      null,
    );
  }
}
