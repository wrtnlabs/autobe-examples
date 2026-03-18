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

export async function test_api_timelog_create_with_timesheet_link_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a new member.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass!1234",
      organizationName: `Org ${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/accept",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };
  // 2) Create an active project (Project A)
  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      userConnection,
      {
        body: {
          name: `Project ${RandomGenerator.alphabets(10)}`,
          color: "#2A2A2A",
          status: "active",
        } satisfies IErpHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  // 3) Create a timesheet (Timesheet X)
  const now = new Date("2026-03-18T11:45:02.217Z");
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      userConnection,
      {
        body: {
          week_start_at: weekStart.toISOString(),
          week_end_at: weekEnd.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: authorized.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  // 4) Create a project membership for the member in Project A
  const membership =
    await generate_random_erp_hrm_time_tracking_member_projects_memberships_create(
      userConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: authorized.id,
          membership_role: "member",
        } satisfies IErpHrmTimeTrackingProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 5) Create timelog linked to that timesheet and project
  const workDate = new Date(weekStart);
  workDate.setUTCDate(workDate.getUTCDate() + 1);
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      userConnection,
      {
        body: {
          erpHrmTimeTrackingProjectId: project.id,
          erpHrmTimeTrackingTimesheetId: timesheet.id,
          work_date: workDate.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          note: "Worked on linked timesheet",
          start_time: null,
          end_time: null,
          erpHrmTimeTrackingTaskId: null,
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
  typia.assert(timelog);
  if (timelog.timesheet === null)
    throw new Error("Expected timelog.timesheet to be non-null");
  TestValidator.equals(
    "timelog timesheet id matches",
    timelog.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timelog project id matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog timesheet status matches",
    timelog.timesheet.status,
    timesheet.status,
  );
}
