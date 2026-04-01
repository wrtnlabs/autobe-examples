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
import { generate_random_erp_hrm_time_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_time_timesheet_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timesheet_timelog";

export async function test_api_timesheet_add_timelog_to_own_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const response: IErpHrmTimeTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          erp_hrm_time_timelog_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(response);
  TestValidator.predicate("timesheet has an id", response.id.length > 0);
  TestValidator.predicate(
    "timesheet has a week start date",
    response.weekStartDate.length > 0,
  );
  TestValidator.predicate(
    "timesheet has a week end date",
    response.weekEndDate.length > 0,
  );
  TestValidator.predicate(
    "timesheet tracks timelog associations",
    Array.isArray(response.timesheetTimelogs),
  );
  TestValidator.predicate(
    "timesheet contains at least one timelog association",
    response.timesheetTimelogs.length > 0,
  );
  TestValidator.equals(
    "linked timelog association belongs to the same timesheet",
    response.timesheetTimelogs[0].timesheet.id,
    response.id,
  );
  TestValidator.equals(
    "linked timelog association is active",
    response.timesheetTimelogs[0].deleted_at,
    null,
  );
}
