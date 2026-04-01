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
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_timelog_removal_blocked_for_locked_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/register",
      referrer: "https://example.com/erpHrmTime",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: "2026-03-23T00:00:00.000Z",
        weekEndDate: "2026-03-29T23:59:59.999Z",
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.predicate(
    "draft timesheet must contain at least one timelog association",
    timesheet.timesheetTimelogs.length > 0,
  );
  const timelogAssociation = timesheet.timesheetTimelogs[0];
  const submitted = await api.functional.erpHrmTime.member.timesheets.submit(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id should remain stable",
    submitted.id,
    timesheet.id,
  );
  await TestValidator.httpError(
    "deleting a timelog from a submitted timesheet must be blocked",
    [400, 403, 409],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId: timesheet.id,
          timesheetTimelogId: timelogAssociation.id,
        },
      );
    },
  );
  TestValidator.equals(
    "submitted timesheet keeps its original timelog associations",
    submitted.timesheetTimelogs.map((entry) => entry.id),
    timesheet.timesheetTimelogs.map((entry) => entry.id),
  );
  TestValidator.equals(
    "underlying timelog remains the same",
    submitted.timesheetTimelogs[0].timelog.id,
    timelogAssociation.timelog.id,
  );
}
