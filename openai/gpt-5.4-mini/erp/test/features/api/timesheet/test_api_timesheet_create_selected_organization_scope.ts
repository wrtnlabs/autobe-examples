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

export async function test_api_timesheet_create_selected_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` as string &
        tags.Format<"email">,
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const weekStartDate = "2026-03-30T00:00:00.000Z";
  const weekEndDate = "2026-04-05T23:59:59.999Z";
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate,
        weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet week start is preserved",
    timesheet.weekStartDate,
    weekStartDate,
  );
  TestValidator.equals(
    "timesheet week end is preserved",
    timesheet.weekEndDate,
    weekEndDate,
  );
  TestValidator.predicate(
    "timesheet owns an employee record",
    timesheet.employee.id.length > 0,
  );
  TestValidator.predicate(
    "timesheet timelog associations are internally consistent",
    timesheet.timesheetTimelogs.every(
      (association) => association.timesheet.id === timesheet.id,
    ),
  );
  TestValidator.predicate(
    "included timelogs belong to the same member as the timesheet employee",
    timesheet.timesheetTimelogs.every(
      (association) => association.timelog.member != null,
    ),
  );
}
