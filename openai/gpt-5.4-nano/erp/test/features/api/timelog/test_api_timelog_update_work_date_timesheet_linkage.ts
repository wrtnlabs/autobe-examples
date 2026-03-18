import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_projects_memberships_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_memberships_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_project_membership } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project_membership";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timelog_update_work_date_timesheet_linkage(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: RandomGenerator.pick([
        "USD",
        "KRW",
        "EUR",
        "JPY",
      ]),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/href",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorized.token.access },
  };
  // Create project & assign member (use generator to keep service-valid status/role)
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color: "#00aa00",
          status: typia.random<string>(),
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        employee_id: memberAuthorized.id,
        membership_role: typia.random<string>(),
      } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
    },
  );
  const now = new Date();
  const daysToAdd = (n: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + n);
    return d;
  };
  const w1WorkDate = daysToAdd(-14).toISOString();
  const w2WorkDate = daysToAdd(0).toISOString();
  const w1Timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: daysToAdd(-21).toISOString(),
          week_end_at: daysToAdd(-14).toISOString(),
          status: typia.random<string>(),
          erp_hrm_time_tracking_employee_id: memberAuthorized.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(w1Timesheet);
  const w2Timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: daysToAdd(-7).toISOString(),
          week_end_at: daysToAdd(0).toISOString(),
          status: typia.random<string>(),
          erp_hrm_time_tracking_employee_id: memberAuthorized.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(w2Timesheet);
  const timelogW1 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: w1WorkDate,
          start_time: null,
          end_time: null,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          note: null,
          erpHrmTimeTrackingProjectId: project.id,
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: w1Timesheet.id,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelogW1);
  // Success: edit allowed when timesheet is not submitted/approved.
  await api.functional.erpHrmTimeTracking.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelogW1.id,
      body: {
        work_date: w2WorkDate,
      } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
    },
  );
  // Denied: create a second timelog, then submit+approve W1 timesheet and attempt update.
  const timelogW1Immutable =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: w1WorkDate,
          start_time: null,
          end_time: null,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          note: null,
          erpHrmTimeTrackingProjectId: project.id,
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: w1Timesheet.id,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelogW1Immutable);
  const submitted =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      { timesheetId: w1Timesheet.id },
    );
  typia.assert(submitted);
  const approved =
    await api.functional.erpHrmTimeTracking.member.timesheets.approve.approveTimesheet(
      memberConnection,
      {
        timesheetId: w1Timesheet.id,
        body: { notes: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  typia.assert(approved);
  await TestValidator.error(
    "work_date update should be denied when timesheet is approved",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelogW1Immutable.id,
          body: {
            work_date: w2WorkDate,
          } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
        },
      );
    },
  );
}
