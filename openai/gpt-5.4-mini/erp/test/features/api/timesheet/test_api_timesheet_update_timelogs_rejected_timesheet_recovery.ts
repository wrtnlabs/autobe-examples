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

export async function test_api_timesheet_update_timelogs_rejected_timesheet_recovery(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const collaboratorConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: `owner.${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const collaborator = await authorize_member_join(collaboratorConnection, {
    body: {
      email: `collaborator.${RandomGenerator.alphaNumeric(10)}@example.com`,
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(collaborator);
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const firstTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(ownerConnection, {
      body: {
        workDate: new Date(
          monday.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        durationMinutes: 120,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(firstTimelog);
  const secondTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(ownerConnection, {
      body: {
        workDate: new Date(
          monday.getTime() + 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        durationMinutes: 45,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: false,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(secondTimelog);
  const outsiderTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      collaboratorConnection,
      {
        body: {
          workDate: new Date(
            monday.getTime() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          durationMinutes: 60,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(outsiderTimelog);
  const outsideWeekTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(ownerConnection, {
      body: {
        workDate: new Date(
          sunday.getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        durationMinutes: 30,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        taskId: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    });
  typia.assert(outsideWeekTimelog);
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    ownerConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  const rejected = await api.functional.erpHrmTime.member.timesheets.reject(
    ownerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejectionReason: true,
      } satisfies IErpHrmTimeTimesheet.IReject,
    },
  );
  typia.assert(rejected);
  TestValidator.predicate(
    "timesheet enters rejected state",
    rejected.status === "rejected",
  );
  const updated =
    await api.functional.erpHrmTime.member.timesheets.timelogs.update(
      ownerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [firstTimelog.id, secondTimelog.id] satisfies (string &
            tags.Format<"uuid">)[],
        } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
      },
    );
  typia.assert(updated);
  TestValidator.predicate(
    "timesheet remains rejected after timelog update",
    updated.status === "rejected",
  );
  TestValidator.predicate(
    "updated timesheet contains linked timelogs",
    updated.timesheetTimelogs.length === 2,
  );
  const linkedTimelogIds = updated.timesheetTimelogs.map(
    (item) => item.timelog.id,
  );
  TestValidator.predicate(
    "first owner timelog is linked",
    linkedTimelogIds.includes(firstTimelog.id),
  );
  TestValidator.predicate(
    "second owner timelog is linked",
    linkedTimelogIds.includes(secondTimelog.id),
  );
  const expectedMinutes =
    firstTimelog.duration_minutes + secondTimelog.duration_minutes;
  const actualMinutes = updated.timesheetTimelogs.reduce(
    (sum, item) => sum + item.timelog.durationMinutes,
    0,
  );
  TestValidator.equals(
    "recalculated timelog minutes",
    actualMinutes,
    expectedMinutes,
  );
  await TestValidator.error(
    "reject timelog from another employee",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.update(
        ownerConnection,
        {
          timesheetId: timesheet.id,
          body: {
            timelogIds: [
              firstTimelog.id,
              outsiderTimelog.id,
            ] satisfies (string & tags.Format<"uuid">)[],
          } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
        },
      );
    },
  );
  await TestValidator.error(
    "reject timelog outside the timesheet week",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.update(
        ownerConnection,
        {
          timesheetId: timesheet.id,
          body: {
            timelogIds: [
              firstTimelog.id,
              outsideWeekTimelog.id,
            ] satisfies (string & tags.Format<"uuid">)[],
          } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
        },
      );
    },
  );
}
