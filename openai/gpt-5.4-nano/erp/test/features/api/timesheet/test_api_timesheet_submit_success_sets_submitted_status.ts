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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_submit_success_sets_submitted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join / authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `pw_${RandomGenerator.alphabets(10)}!1`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: `org_${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // Use the same authorized connection for all subsequent calls
  // (connection.headers have been updated by authorize_member_join).
  // 2) Create project within the org context
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `project_${RandomGenerator.alphabets(8)}`,
          color: "#3b82f6",
          status: "active",
        } satisfies DeepPartial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(project);
  // 3) Create a timesheet for the employee/week in draft state
  const nowSeoul = new Date();
  const tzOffsetMs = 9 * 60 * 60 * 1000;
  const local = new Date(nowSeoul.getTime() + tzOffsetMs);
  // Next Monday (Mon=1 ... Sun=0)
  const utcDay = local.getUTCDay();
  const daysToMon = (8 - (utcDay === 0 ? 7 : utcDay + 0)) % 7;
  const nextMon = new Date(local);
  nextMon.setUTCDate(local.getUTCDate() + daysToMon);
  nextMon.setUTCHours(0, 0, 0, 0);
  const nextSun = new Date(nextMon);
  nextSun.setUTCDate(nextMon.getUTCDate() + 6);
  nextSun.setUTCHours(23, 59, 59, 0);
  const week_start_at = nextMon.toISOString();
  const week_end_at = nextSun.toISOString();
  const timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: week_start_at satisfies string &
            tags.Format<"date-time">,
          week_end_at: week_end_at satisfies string & tags.Format<"date-time">,
          status: "draft",
          erp_hrm_time_tracking_employee_id: authorized.id satisfies string &
            tags.Format<"uuid">,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies DeepPartial<IErpHrmTimeTrackingTimesheet.ICreate>,
      },
    );
  typia.assert(timesheet);
  // 4) Create timelogs linked to this timesheet
  const workDate = new Date(nextMon);
  workDate.setUTCHours(10, 0, 0, 0);
  const start_time = workDate.toISOString();
  const end_time = new Date(workDate.getTime() + 60 * 60 * 1000).toISOString();
  await ArrayUtil.asyncRepeat(2, async () => {
    const timelog =
      await generate_random_erp_hrm_time_tracking_member_timelogs_create(
        memberConnection,
        {
          body: {
            work_date: workDate.toISOString() satisfies string &
              tags.Format<"date-time">,
            duration_minutes: 60,
            note: "test timelog",
            start_time: start_time satisfies string & tags.Format<"date-time">,
            end_time: end_time satisfies string & tags.Format<"date-time">,
            erpHrmTimeTrackingProjectId: project.id,
            erpHrmTimeTrackingTimesheetId: timesheet.id,
            erpHrmTimeTrackingTaskId: null,
          } satisfies DeepPartial<IErpHrmTimeTrackingTimelog.ICreate>,
        },
      );
    typia.assert(timelog);
  });
  // 5) Submit timesheet
  const submitted =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submitted);
  // Validations
  TestValidator.equals(
    "status becomes submitted",
    submitted.status,
    "submitted",
  );
  TestValidator.predicate("submittedAt is set", submitted.submittedAt !== null);
  TestValidator.equals("approvedAt remains null", submitted.approvedAt, null);
  TestValidator.equals("rejectedAt remains null", submitted.rejectedAt, null);
  TestValidator.equals(
    "organization scoping (timesheet belongs to project org)",
    submitted.erpHrmTimeTrackingOrganizationId,
    project.erp_hrm_time_tracking_organization_id,
  );
  TestValidator.equals(
    "employee scoping (timesheet belongs to authenticated employee)",
    submitted.erpHrmTimeTrackingEmployeeId,
    authorized.id,
  );
}
