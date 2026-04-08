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

export async function test_api_timelog_update_locked_or_mismatched_project(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Abcd",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erp/hrm/time/join",
      referrer: "https://example.com/erp/hrm/time",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const activeConnection: api.IConnection = { host: connection.host };
  activeConnection.headers = {
    Authorization: `Bearer ${joined.token.access}`,
  };
  const created = await generate_random_erp_hrm_time_member_timelogs_create(
    activeConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 30,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(created);
  const updated = await api.functional.erpHrmTime.member.timelogs.update(
    activeConnection,
    {
      timelogId: created.id,
      body: {
        work_date: new Date(Date.now() + 60000).toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: false,
      } satisfies IErpHrmTimeTimelog.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "timelog id should remain the same",
    updated.id,
    created.id,
  );
  TestValidator.notEquals(
    "work date should change after update",
    created.workDate,
    updated.workDate,
  );
  TestValidator.equals("duration should update", updated.durationMinutes, 60);
  TestValidator.equals("billable flag should update", updated.billable, false);
  TestValidator.notEquals(
    "description should change after update",
    created.description,
    updated.description,
  );
  const second = await generate_random_erp_hrm_time_member_timelogs_create(
    activeConnection,
    {
      body: {
        workDate: new Date(Date.now() - 86400000).toISOString(),
        durationMinutes: 45,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(second);
  const secondUpdated = await api.functional.erpHrmTime.member.timelogs.update(
    activeConnection,
    {
      timelogId: second.id,
      body: {
        work_date: new Date(Date.now() + 120000).toISOString(),
        duration_minutes: 15,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.IUpdate,
    },
  );
  typia.assert(secondUpdated);
  TestValidator.equals(
    "second timelog id should remain the same",
    secondUpdated.id,
    second.id,
  );
  TestValidator.equals(
    "second timelog duration should update",
    secondUpdated.durationMinutes,
    15,
  );
}
