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

export async function test_api_timesheet_timelog_attachment_workflow_lock(
  connection: api.IConnection,
): Promise<void> {
  const primaryConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(primaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const project = await generate_random_erp_hrm_time_member_projects_create(
    primaryConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const workDate = new Date();
  const timelog = await generate_random_erp_hrm_time_member_timelogs_create(
    primaryConnection,
    {
      body: {
        workDate: workDate.toISOString(),
        durationMinutes: 60,
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  const monday = new Date("2026-03-30T00:00:00.000Z");
  const sunday = new Date("2026-04-05T23:59:59.999Z");
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    primaryConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  const attached =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      primaryConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          timelogId: timelog.id,
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(attached);
  TestValidator.equals(
    "attached timesheet id",
    attached.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals("attached timelog id", attached.timelog.id, timelog.id);
  const secondaryConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondaryConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
      displayName: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const foreignProject =
    await generate_random_erp_hrm_time_member_projects_create(
      secondaryConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff6633",
          status: "active",
        } satisfies IErpHrmTimeProject.ICreate,
      },
    );
  typia.assert(foreignProject);
  const foreignTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      secondaryConnection,
      {
        body: {
          workDate: workDate.toISOString(),
          durationMinutes: 45,
          projectId: foreignProject.id,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(foreignTimelog);
  const foreignTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_create(
      secondaryConnection,
      {
        body: {
          weekStartDate: monday.toISOString(),
          weekEndDate: sunday.toISOString(),
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(foreignTimesheet);
  await TestValidator.httpError(
    "cannot attach timelog to another employee's timesheet",
    [401, 403, 404],
    async () => {
      await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
        primaryConnection,
        {
          params: { timesheetId: foreignTimesheet.id },
          body: {
            timelogId: timelog.id,
          } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "cannot attach a timelog again once the timesheet workflow is locked",
    [400, 403, 409],
    async () => {
      await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
        primaryConnection,
        {
          params: { timesheetId: timesheet.id },
          body: {
            timelogId: timelog.id,
          } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
        },
      );
    },
  );
}
