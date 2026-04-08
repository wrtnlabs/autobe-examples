import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { generate_random_erp_hrm_time_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";
import { prepare_random_erp_hrm_time_timesheet_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timesheet_timelog";

export async function test_api_timesheet_timelog_attachment_employee_week_scope(
  connection: api.IConnection,
): Promise<void> {
  const weekStartDate = "2026-03-30T00:00:00.000Z";
  const weekEndDate = "2026-04-05T23:59:59.000Z";
  const inWeekWorkDate = "2026-04-01T09:00:00.000Z";
  const outOfWeekWorkDate = "2026-04-12T09:00:00.000Z";
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerJoinConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: ownerAuthorized.token.access },
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const insideTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(ownerConnection, {
      body: {
        workDate: inWeekWorkDate,
        durationMinutes: 120,
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(insideTimelog);
  const outsideTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(ownerConnection, {
      body: {
        workDate: outOfWeekWorkDate,
        durationMinutes: 90,
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(outsideTimelog);
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    ownerConnection,
    {
      body: {
        weekStartDate,
        weekEndDate,
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  const attached =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      ownerConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          timelogId: insideTimelog.id,
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(attached);
  TestValidator.equals(
    "attached timesheet matches",
    attached.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "attached timelog matches",
    attached.timelog.id,
    insideTimelog.id,
  );
  await TestValidator.error(
    "reject out-of-week timelog attachment",
    async () => {
      await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
        ownerConnection,
        {
          params: { timesheetId: timesheet.id },
          body: {
            timelogId: outsideTimelog.id,
          } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
        },
      );
    },
  );
  const otherJoinConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_member_join(otherJoinConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}2@example.com`,
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const otherConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: otherAuthorized.token.access },
  };
  const otherProject =
    await generate_random_erp_hrm_time_member_projects_create(otherConnection, {
      body: {
        name: RandomGenerator.name(),
        colorCode: "#ff6633",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    });
  typia.assert(otherProject);
  const otherTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(otherConnection, {
      body: {
        workDate: inWeekWorkDate,
        durationMinutes: 60,
        projectId: otherProject.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(otherTimelog);
  await TestValidator.error(
    "reject cross-employee timelog attachment",
    async () => {
      await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
        ownerConnection,
        {
          params: { timesheetId: timesheet.id },
          body: {
            timelogId: otherTimelog.id,
          } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
        },
      );
    },
  );
}
