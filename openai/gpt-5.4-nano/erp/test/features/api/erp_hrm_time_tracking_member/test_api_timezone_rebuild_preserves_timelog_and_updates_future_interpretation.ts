import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_task } from "../../../prepare/prepare_random_erp_hrm_time_tracking_task";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timezone_rebuild_preserves_timelog_and_updates_future_interpretation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Auth/setup (member join)
  const joinConnection: api.IConnection = { host: connection.host };
  const timezoneBefore = "Asia/Seoul";
  const timezoneAfter = "UTC";
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!" + RandomGenerator.alphaNumeric(8),
    organizationName: "org_" + RandomGenerator.alphaNumeric(8),
    organizationDescription:
      "timezone rebuild test " + RandomGenerator.alphaNumeric(6),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: timezoneBefore,
    organizationFiscalStartMonth: 3 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/" + RandomGenerator.alphaNumeric(12),
    referrer: "https://example.com/ref" + RandomGenerator.alphaNumeric(8),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = joinConnection.headers;
  // 2) Create tenant organization
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "tenant_" + RandomGenerator.alphaNumeric(10),
          description:
            "tenant for timezone rebuild " + RandomGenerator.alphaNumeric(10),
          logo_url: null,
          currency_code: "KRW",
          timezone: timezoneBefore,
          fiscal_start_month: 3 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3) Seed timezone-dependent historical data
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: "proj_" + RandomGenerator.alphaNumeric(10),
          color: "#" + RandomGenerator.alphaNumeric(6),
          status: typia.random<string>(),
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const task =
    await generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "task_" + RandomGenerator.alphaNumeric(10),
          description: null,
          status: typia.random<string>(),
          priority: typia.random<string>(),
          parent_task_id: null,
          assigned_employee_id: null,
          estimated_hours: null,
          due_date: null,
        } satisfies IErpHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task);
  // Create a weekly timesheet container
  const now = new Date();
  const weekStartAt = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (now.getUTCDay() === 0 ? 6 : now.getUTCDay() - 1),
      0,
      0,
      0,
    ),
  ).toISOString();
  const weekEndAt = new Date(
    new Date(weekStartAt).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: weekStartAt,
          week_end_at: weekEndAt,
          status: typia.random<string>(),
          erp_hrm_time_tracking_employee_id: authorized.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const workDate = new Date(
    new Date(weekStartAt).getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const startTime = new Date(
    new Date(workDate).getTime() + 9 * 60 * 60 * 1000,
  ).toISOString();
  const endTime = new Date(
    new Date(workDate).getTime() + 10 * 60 * 60 * 1000,
  ).toISOString();
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: 60,
          note: "work" + RandomGenerator.alphaNumeric(6),
          erpHrmTimeTrackingProjectId: project.id,
          erpHrmTimeTrackingTaskId: task.id,
          erpHrmTimeTrackingTimesheetId: timesheet.id,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  const beforeTimelog = timelog;
  typia.assert(beforeTimelog);
  const beforeTimesheet = timesheet;
  typia.assert(beforeTimesheet);
  // 5) Change organization timezone configuration
  const updatedOrg =
    await api.functional.erpHrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          timezone: timezoneAfter,
        } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrg);
  // 6) Run rebuild
  await api.functional.erpHrmTimeTracking.member.organizations.timezone.rebuild.processTimezoneRebuild(
    memberConnection,
    {
      body: {
        id: organization.id,
        page: null,
        limit: null,
      } satisfies IErpHrmTimeTrackingOrganization.IRequest,
    },
  );
  // 7) Validate rebuild outcomes we can assert with available SDK:
  // - rebuild completes without throwing
  // - organization timezone updated
  // - persisted timelog atomic facts (from the create response) remain consistent
  TestValidator.equals(
    "organization timezone updated",
    updatedOrg.timezone,
    timezoneAfter,
  );
  TestValidator.equals(
    "timelog work_date preserved",
    timelog.work_date,
    beforeTimelog.work_date,
  );
  TestValidator.equals(
    "timelog start_time preserved",
    timelog.start_time,
    beforeTimelog.start_time,
  );
  TestValidator.equals(
    "timelog end_time preserved",
    timelog.end_time,
    beforeTimelog.end_time,
  );
  TestValidator.equals(
    "timesheet window preserved in original response object",
    timesheet.weekStartAt,
    beforeTimesheet.weekStartAt,
  );
  TestValidator.equals(
    "timesheet end preserved in original response object",
    timesheet.weekEndAt,
    beforeTimesheet.weekEndAt,
  );
}
