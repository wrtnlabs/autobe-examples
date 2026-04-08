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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
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

export async function test_api_timesheet_timelogs_update_draft_self_service(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const now = new Date();
  const utcDay = now.getUTCDay();
  const mondayOffset = utcDay === 0 ? -6 : 1 - utcDay;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + mondayOffset,
      0,
      0,
      0,
      0,
    ),
  );
  const weekEnd = new Date(
    Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate() + 6,
      23,
      59,
      59,
      999,
    ),
  );
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
  const firstPatch =
    await api.functional.erpHrmTime.member.timesheets.timelogs.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {} satisfies IErpHrmTimeTimesheet.ITimelogUpdate,
      },
    );
  typia.assert(firstPatch);
  TestValidator.predicate(
    "patch response is paginated",
    firstPatch.pagination.records >= 1,
  );
  const firstRecord = firstPatch.data.find((item) => item.id === timesheet.id);
  TestValidator.predicate(
    "target timesheet exists in patch response",
    firstRecord !== undefined,
  );
  if (firstRecord === undefined) return;
  TestValidator.equals(
    "timesheet id remains stable",
    firstRecord.id,
    timesheet.id,
  );
  TestValidator.equals("timesheet remains draft", firstRecord.status, "draft");
  TestValidator.equals(
    "timesheet week start remains stable",
    firstRecord.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "timesheet week end remains stable",
    firstRecord.weekEndDate,
    timesheet.weekEndDate,
  );
  const secondPatch =
    await api.functional.erpHrmTime.member.timesheets.timelogs.index(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {} satisfies IErpHrmTimeTimesheet.ITimelogUpdate,
      },
    );
  typia.assert(secondPatch);
  TestValidator.predicate(
    "second patch response is paginated",
    secondPatch.pagination.records >= 1,
  );
  const secondRecord = secondPatch.data.find(
    (item) => item.id === timesheet.id,
  );
  TestValidator.predicate(
    "target timesheet exists after second patch",
    secondRecord !== undefined,
  );
  if (secondRecord === undefined) return;
  TestValidator.equals(
    "timesheet id remains stable after second patch",
    secondRecord.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timesheet remains draft after second patch",
    secondRecord.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet week start remains stable after second patch",
    secondRecord.weekStartDate,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "timesheet week end remains stable after second patch",
    secondRecord.weekEndDate,
    timesheet.weekEndDate,
  );
  TestValidator.equals(
    "repeated draft update keeps the same record identity",
    firstRecord.id,
    secondRecord.id,
  );
}
