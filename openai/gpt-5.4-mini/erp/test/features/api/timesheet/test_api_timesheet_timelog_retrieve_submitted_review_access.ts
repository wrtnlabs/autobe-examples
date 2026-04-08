import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
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
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { generate_random_erp_hrm_time_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";
import { prepare_random_erp_hrm_time_timesheet_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timesheet_timelog";

export async function test_api_timesheet_timelog_retrieve_submitted_review_access(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `member-${RandomGenerator.alphaNumeric(12)}@test.com`;
  const memberPassword = "1234";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `http://localhost/${RandomGenerator.alphaNumeric(10)}`,
      referrer: `http://localhost/${RandomGenerator.alphaNumeric(10)}`,
      ip: null,
    },
  });
  typia.assert(authorized);
  const weekStart = new Date("2026-03-30T00:00:00.000Z");
  const weekEnd = new Date("2026-04-05T23:59:59.999Z");
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  const timelogAssociation =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          timelogId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(timelogAssociation);
  const retrieved =
    await api.functional.erpHrmTime.member.timesheets.timelogs.at(
      memberConnection,
      {
        timesheetId: timesheet.id,
        timesheetTimelogId: timelogAssociation.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "association id matches",
    retrieved.id,
    timelogAssociation.id,
  );
  TestValidator.equals(
    "parent timesheet id matches",
    retrieved.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "linked timelog id matches",
    retrieved.timelog.id,
    timelogAssociation.timelog.id,
  );
  TestValidator.equals(
    "retrieved association belongs to same timesheet week",
    retrieved.timesheet.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "retrieved association belongs to same timesheet end date",
    retrieved.timesheet.weekEndDate,
    timesheet.weekEndDate,
  );
  TestValidator.predicate(
    "association is not deleted",
    retrieved.deletedAt === null,
  );
  await TestValidator.error(
    "mismatched parent timesheet should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.at(
        memberConnection,
        {
          timesheetId: typia.random<string & tags.Format<"uuid">>(),
          timesheetTimelogId: timelogAssociation.id,
        },
      );
    },
  );
}
