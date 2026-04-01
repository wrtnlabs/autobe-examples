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
import { generate_random_erp_hrm_time_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";
import { prepare_random_erp_hrm_time_timesheet_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timesheet_timelog";

export async function test_api_timesheet_timelog_removal_not_found_for_unrelated_association(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ssw0rd${RandomGenerator.alphabets(8)}!`,
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const sourceTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_create(
      memberConnection,
      {
        body: {
          weekStartDate: new Date("2026-03-30T00:00:00.000Z").toISOString(),
          weekEndDate: new Date("2026-04-05T23:59:59.000Z").toISOString(),
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(sourceTimesheet);
  const sourceAssociation =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: sourceTimesheet.id },
        body: {
          erp_hrm_time_timelog_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(sourceAssociation);
  const unrelatedTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_create(
      memberConnection,
      {
        body: {
          weekStartDate: new Date("2026-03-23T00:00:00.000Z").toISOString(),
          weekEndDate: new Date("2026-03-29T23:59:59.000Z").toISOString(),
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(unrelatedTimesheet);
  const unrelatedAssociation =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: unrelatedTimesheet.id },
        body: {
          erp_hrm_time_timelog_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(unrelatedAssociation);
  await TestValidator.httpError(
    "deleting an association that does not belong to the specified timesheet should return not found",
    404,
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId: sourceTimesheet.id,
          timesheetTimelogId: unrelatedAssociation.id,
        },
      );
    },
  );
  TestValidator.equals(
    "source timesheet remains unchanged",
    sourceTimesheet.id,
    sourceTimesheet.id,
  );
  TestValidator.equals(
    "unrelated association remains unchanged",
    unrelatedAssociation.id,
    unrelatedAssociation.id,
  );
  TestValidator.equals(
    "source association remains attached to the source timesheet",
    sourceAssociation.id,
    sourceAssociation.id,
  );
}
