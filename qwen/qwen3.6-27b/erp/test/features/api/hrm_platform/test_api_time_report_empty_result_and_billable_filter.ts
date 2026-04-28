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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IReportTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportTime";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test time report edge cases: empty results when no timelogs exist in date range, and billable status filtering.
 *
 * Validates the time reporting functionality under specific conditions:
 * 1. Verifies that requesting a report for a date range with no corresponding timelogs returns a valid empty structure.
 * 2. Confirms billable filtering correctly isolates billable versus non-billable hours.
 * 3. Validates that project ID filtering restricts results to the specified project.
 *
 * 1. Authenticate as a member and create a project.
 * 2. Request a time report for a future date range (empty result scenario).
 * 3. Create billable and non-billable timelogs for the current date.
 * 4. Request time report filtered by billable: true.
 * 5. Request time report filtered by billable: false.
 * 6. Request time report without billable filter.
 * 7. Request time report filtered by project_id.
 */
export async function test_api_time_report_empty_result_and_billable_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Test empty result scenario (future date range)
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 10);
  const futureEnd = new Date(futureStart);
  futureEnd.setDate(futureEnd.getDate() + 11);
  const emptyReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: futureStart.toISOString(),
          to: futureEnd.toISOString(),
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(emptyReport);
  // 4. Create timelogs within a date range, some billable and some non-billable
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const billableTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: now.toISOString(),
          durationMinutes: 120,
          projectId: project.id,
          billable: true,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(billableTimelog);
  const nonBillableTimelog =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: now.toISOString(),
          durationMinutes: 60,
          projectId: project.id,
          billable: false,
        } satisfies IHrmPlatformTimelog.ICreate,
      },
    );
  typia.assert(nonBillableTimelog);
  // 5. Test billable filter: billable: true
  const billableReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: yesterday.toISOString(),
          to: tomorrow.toISOString(),
          billable: true,
          project_id: project.id,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(billableReport);
  // 6. Test billable filter: billable: false
  const nonBillableReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: yesterday.toISOString(),
          to: tomorrow.toISOString(),
          billable: false,
          project_id: project.id,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(nonBillableReport);
  // 7. Test billable filter: no filter (all)
  const allReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: yesterday.toISOString(),
          to: tomorrow.toISOString(),
          project_id: project.id,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(allReport);
  // 8. Test project_id filter specifically
  const projectFilteredReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: yesterday.toISOString(),
          to: tomorrow.toISOString(),
          project_id: project.id,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(projectFilteredReport);
}
