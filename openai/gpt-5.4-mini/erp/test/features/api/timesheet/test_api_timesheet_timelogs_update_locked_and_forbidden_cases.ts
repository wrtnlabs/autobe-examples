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
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";

export async function test_api_timesheet_timelogs_update_locked_and_forbidden_cases(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const weekStartDate = new Date("2026-03-30T00:00:00.000Z");
  const weekEndDate = new Date("2026-04-05T23:59:59.999Z");
  const draftTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_create(
      memberConnection,
      {
        body: {
          weekStartDate: weekStartDate.toISOString(),
          weekEndDate: weekEndDate.toISOString(),
        },
      },
    );
  typia.assert(draftTimesheet);
  await TestValidator.error(
    "rejects locked or forbidden timesheet timelog updates",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.index(
        memberConnection,
        {
          timesheetId: draftTimesheet.id,
          body: {
            addTimelogIds: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IErpHrmTimeTimesheet.ITimelogUpdate,
        },
      );
    },
  );
  const nextWeekTimesheet =
    await generate_random_erp_hrm_time_member_timesheets_create(
      memberConnection,
      {
        body: {
          weekStartDate: new Date("2026-03-23T00:00:00.000Z").toISOString(),
          weekEndDate: new Date("2026-03-29T23:59:59.999Z").toISOString(),
        },
      },
    );
  typia.assert(nextWeekTimesheet);
  await TestValidator.error(
    "rejects timelog additions outside the target week",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.index(
        memberConnection,
        {
          timesheetId: nextWeekTimesheet.id,
          body: {
            addTimelogIds: [typia.random<string & tags.Format<"uuid">>()],
          } satisfies IErpHrmTimeTimesheet.ITimelogUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "rejects empty timelog update payload",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.index(
        memberConnection,
        {
          timesheetId: draftTimesheet.id,
          body: {} satisfies IErpHrmTimeTimesheet.ITimelogUpdate,
        },
      );
    },
  );
}
