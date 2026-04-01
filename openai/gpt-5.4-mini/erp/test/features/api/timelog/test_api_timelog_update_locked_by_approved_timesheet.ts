import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timelog_update_locked_by_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Abcd!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId: string | null = null;
  const timelog = await generate_random_erp_hrm_time_member_timelogs_create(
    memberConnection,
    {
      body: {
        workDate: new Date("2026-03-30T09:00:00.000Z").toISOString(),
        durationMinutes: 120,
        projectId,
        taskId,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  const original = timelog;
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: new Date("2026-03-30T00:00:00.000Z").toISOString(),
        weekEndDate: new Date("2026-04-05T23:59:59.999Z").toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.predicate(
    "timesheet should include the created timelog",
    timesheet.timesheetTimelogs.some((row) => row.timelog.id === timelog.id),
  );
  const updateBody = {
    work_date: new Date("2026-03-31T10:30:00.000Z").toISOString(),
    duration_minutes: 150,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    billable: false,
    erp_hrm_time_project_id: projectId,
    erp_hrm_time_task_id: taskId,
  } satisfies IErpHrmTimeTimelog.IUpdate;
  await TestValidator.error(
    "timelog update should be rejected after timesheet approval lock",
    async () => {
      await api.functional.erpHrmTime.member.timelogs.update(memberConnection, {
        timelogId: timelog.id,
        body: updateBody,
      });
    },
  );
  TestValidator.equals("id unchanged", timelog.id, original.id);
  TestValidator.equals(
    "work date unchanged",
    timelog.work_date,
    original.work_date,
  );
  TestValidator.equals(
    "duration unchanged",
    timelog.duration_minutes,
    original.duration_minutes,
  );
  TestValidator.equals(
    "description unchanged",
    timelog.description,
    original.description,
  );
  TestValidator.equals(
    "billable unchanged",
    timelog.billable,
    original.billable,
  );
}
