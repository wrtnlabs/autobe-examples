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
 * Test generating a time tracking report grouped by employee for a specific date range.
 *
 * Validates the complete time report generation flow including member authentication, organization creation, project setup, timelog creation with varying billable status, and report aggregation. Ensures that the report correctly aggregates total minutes, billable minutes, and non-billable minutes per employee.
 *
 * Special attention is given to verifying that the aggregation math is correct: total_minutes must equal billable_minutes plus non_billable_minutes. The test also validates that employee summary data is properly populated while project and task fields remain null when grouping by employee.
 *
 * 1. Member registers and authenticates as organization owner.
 * 2. Organization is created with owner automatically assigned.
 * 3. Project is created within the organization.
 * 4. Multiple timelogs are created with different durations and billable statuses.
 * 5. Time report is requested grouped by employee.
 * 6. Validates aggregation: total_minutes = billable_minutes + non_billable_minutes.
 */
export async function test_api_time_report_grouped_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member (becomes organization owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // Set authorization header from the returned token
  memberConnection.headers = {
    Authorization: `Bearer ${member.token.access}`,
  };
  // 2. Create organization (member automatically becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 4. Create multiple timelogs with varying billable status
  // Use dates within a specific range for the report query
  const baseDate = new Date("2024-06-01T00:00:00Z");
  // Timelog 1: 60 minutes, billable
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: baseDate.toISOString(),
        duration_minutes: 60,
        hrm_platform_project_id: project.id,
        billable: true,
        description: "Billable work session 1",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: 90 minutes, billable
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date("2024-06-02T00:00:00Z").toISOString(),
        duration_minutes: 90,
        hrm_platform_project_id: project.id,
        billable: true,
        description: "Billable work session 2",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: 45 minutes, non-billable
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date("2024-06-03T00:00:00Z").toISOString(),
        duration_minutes: 45,
        hrm_platform_project_id: project.id,
        billable: false,
        description: "Internal training session",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: 30 minutes, non-billable
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date("2024-06-04T00:00:00Z").toISOString(),
        duration_minutes: 30,
        hrm_platform_project_id: project.id,
        billable: false,
        description: "Administrative tasks",
      },
    },
  );
  typia.assert(timelog4);
  // 5. Request time report grouped by employee
  const report = await api.functional.hrmPlatform.member.reports.time.search(
    memberConnection,
    {
      body: {
        dateFrom: "2024-06-01",
        dateTo: "2024-06-30",
        groupBy: "employee",
      } satisfies IHrmPlatformTimeReport.IRequest,
    },
  );
  typia.assert(report);
  // 6. Validate aggregation results
  // Expected: total = 60 + 90 + 45 + 30 = 225 minutes
  // Expected: billable = 60 + 90 = 150 minutes
  // Expected: non_billable = 45 + 30 = 75 minutes
  TestValidator.predicate(
    "employee summary is populated",
    report.employee !== null && report.employee !== undefined,
  );
  TestValidator.predicate(
    "project is null when grouped by employee",
    report.project === null || report.project === undefined,
  );
  TestValidator.predicate(
    "task is null when grouped by employee",
    report.task === null || report.task === undefined,
  );
  TestValidator.equals("total minutes", report.total_minutes, 225);
  TestValidator.equals("billable minutes", report.billable_minutes, 150);
  TestValidator.equals("non-billable minutes", report.non_billable_minutes, 75);
  TestValidator.predicate(
    "total equals billable plus non-billable",
    report.total_minutes ===
      report.billable_minutes + report.non_billable_minutes,
  );
}
