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

export async function test_api_timesheet_timelog_removal_from_editable_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const monday = (() => {
    const now = new Date();
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    const offset = (base.getDay() + 6) % 7;
    base.setDate(base.getDate() - offset);
    return base;
  })();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 0);
  const firstTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: new Date(monday.getTime() + 60 * 60 * 1000).toISOString(),
          durationMinutes: 90,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: "first editable timelog",
          billable: true,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(firstTimelog);
  const secondTimelog =
    await generate_random_erp_hrm_time_member_timelogs_create(
      memberConnection,
      {
        body: {
          workDate: new Date(
            monday.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString(),
          durationMinutes: 120,
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: null,
          description: "second editable timelog",
          billable: false,
        } satisfies IErpHrmTimeTimelog.ICreate,
      },
    );
  typia.assert(secondTimelog);
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.predicate(
    "timesheet includes at least two timelogs before removal",
    timesheet.timesheetTimelogs.length >= 2,
  );
  const removedAssociation = timesheet.timesheetTimelogs.find(
    (item) => item.timelog.id === firstTimelog.id,
  );
  const retainedAssociation = timesheet.timesheetTimelogs.find(
    (item) => item.timelog.id === secondTimelog.id,
  );
  TestValidator.predicate(
    "first timelog is included in the timesheet before deletion",
    removedAssociation !== undefined,
  );
  TestValidator.predicate(
    "second timelog is included in the timesheet before deletion",
    retainedAssociation !== undefined,
  );
  if (removedAssociation === undefined || retainedAssociation === undefined)
    throw new Error(
      "Expected both timelogs to exist in the editable timesheet.",
    );
  await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timesheetTimelogId: removedAssociation.id,
    },
  );
  TestValidator.equals(
    "deleted association id remains the selected association id",
    removedAssociation.id,
    removedAssociation.id,
  );
  TestValidator.equals(
    "underlying removed timelog id remains stable",
    firstTimelog.id,
    removedAssociation.timelog.id,
  );
  TestValidator.equals(
    "retained timelog id remains stable",
    secondTimelog.id,
    retainedAssociation.timelog.id,
  );
}
