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
import { generate_random_erp_hrm_time_member_timesheets_draft_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_draft_create";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_update_timelogs_self_service_recalculate_total_hours(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: authorization.token.access,
  };
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  const day = monday.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  monday.setUTCDate(monday.getUTCDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  const draft =
    await generate_random_erp_hrm_time_member_timesheets_draft_create(
      memberConnection,
      {
        body: {
          weekStartDate: monday.toISOString(),
          weekEndDate: sunday.toISOString(),
        } satisfies IErpHrmTimeTimesheet.ICreate,
      },
    );
  typia.assert(draft);
  TestValidator.equals(
    "draft timesheet should start in draft status",
    draft.status,
    "draft",
  );
  TestValidator.predicate(
    "draft timesheet should contain at least one timelog to update",
    draft.timesheetTimelogs.length > 0,
  );
  const originalTimelogIds = draft.timesheetTimelogs.map(
    (item) => item.timelog.id,
  );
  const selectedTimelogIds = originalTimelogIds.slice(
    0,
    Math.min(2, originalTimelogIds.length),
  );
  const updated =
    await api.functional.erpHrmTime.member.timesheets.timelogs.update(
      memberConnection,
      {
        timesheetId: draft.id,
        body: {
          timelogIds: selectedTimelogIds,
        } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "timesheet id should remain the same",
    updated.id,
    draft.id,
  );
  TestValidator.equals(
    "timesheet status should remain draft",
    updated.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet week start should remain unchanged",
    updated.weekStartDate,
    draft.weekStartDate,
  );
  TestValidator.equals(
    "timesheet week end should remain unchanged",
    updated.weekEndDate,
    draft.weekEndDate,
  );
  TestValidator.equals(
    "timesheet employee should remain unchanged",
    updated.employee,
    draft.employee,
  );
  TestValidator.equals(
    "linked timelog count should match requested selection",
    updated.timesheetTimelogs.length,
    selectedTimelogIds.length,
  );
  TestValidator.equals(
    "linked timelog ids should match the requested selection",
    updated.timesheetTimelogs.map((item) => item.timelog.id),
    selectedTimelogIds,
  );
  TestValidator.predicate(
    "all linked timelogs should belong to the updated timesheet",
    updated.timesheetTimelogs.every((item) => item.timesheet.id === updated.id),
  );
}
