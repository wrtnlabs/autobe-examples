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

export async function test_api_timesheet_update_timelogs_reject_locked_and_cross_org_entries(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const weekStart = "2026-03-23T00:00:00.000Z";
  const weekEnd = "2026-03-29T23:59:59.999Z";
  const draftTimesheet =
    await api.functional.erpHrmTime.member.timesheets.create(memberConnection, {
      body: {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
      } satisfies IErpHrmTimeTimesheet.ICreate,
    });
  typia.assert(draftTimesheet);
  const disallowedTimelogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reject linking a disallowed timelog into a mutable timesheet",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.update(
        memberConnection,
        {
          timesheetId: draftTimesheet.id,
          body: {
            timelogIds: [disallowedTimelogId],
          } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
        },
      );
    },
  );
  const approvedTimesheet =
    await api.functional.erpHrmTime.member.timesheets.approve(
      memberConnection,
      {
        timesheetId: draftTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  await TestValidator.error(
    "reject updating an approved timesheet",
    async () => {
      await api.functional.erpHrmTime.member.timesheets.timelogs.update(
        memberConnection,
        {
          timesheetId: approvedTimesheet.id,
          body: {
            timelogIds: [disallowedTimelogId],
          } satisfies IErpHrmTimeTimesheet.IUpdateTimelog,
        },
      );
    },
  );
}
