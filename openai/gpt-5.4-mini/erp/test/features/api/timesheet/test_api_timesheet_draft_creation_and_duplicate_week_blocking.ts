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
import { generate_random_erp_hrm_time_member_timesheets_draft_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_draft_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_draft_creation_and_duplicate_week_blocking(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  const now = new Date();
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekStartDate = monday.toISOString();
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const weekEndDate = sunday.toISOString();
  const created =
    await api.functional.erpHrmTime.member.timesheets.draft.create(
      memberConnection,
      {
        body: {
          weekStartDate,
          weekEndDate,
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("timesheet status", created.status, "draft");
  TestValidator.equals("week start date", created.weekStartDate, weekStartDate);
  TestValidator.equals("week end date", created.weekEndDate, weekEndDate);
  TestValidator.predicate(
    "timesheet owner exists",
    created.employee !== null && created.employee !== undefined,
  );
  TestValidator.predicate(
    "timesheet draft contains linked timelog associations array",
    Array.isArray(created.timesheetTimelogs),
  );
  TestValidator.predicate(
    "all included timelogs belong to the created draft timesheet",
    created.timesheetTimelogs.every(
      (entry) => entry.timesheet.id === created.id,
    ),
  );
  await TestValidator.httpError(
    "duplicate draft for same week should be rejected",
    [400, 409],
    async () => {
      await api.functional.erpHrmTime.member.timesheets.draft.create(
        memberConnection,
        {
          body: {
            weekStartDate,
            weekEndDate,
          } satisfies IErpHrmTimeTimesheet.ICreate,
        },
      );
    },
  );
}
