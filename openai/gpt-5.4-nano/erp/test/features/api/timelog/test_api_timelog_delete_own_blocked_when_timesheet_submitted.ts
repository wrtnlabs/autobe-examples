import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timelog_delete_own_blocked_when_timesheet_submitted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const now = new Date();
  const weekStartAt = new Date(now);
  weekStartAt.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStartAt.setHours(0, 0, 0, 0);
  const weekEndAt = new Date(weekStartAt);
  weekEndAt.setDate(weekEndAt.getDate() + 6);
  weekEndAt.setHours(23, 59, 59, 999);
  const timesheetDraft =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: weekStartAt.toISOString(),
          week_end_at: weekEndAt.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: memberJoin.id satisfies string &
            tags.Format<"uuid">,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheetDraft);
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: weekStartAt.toISOString(),
          erpHrmTimeTrackingTimesheetId: timesheetDraft.id,
        } satisfies DeepPartial<IErpHrmTimeTrackingTimelog.ICreate>,
      },
    );
  typia.assert(timelog);
  const submittedTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheetDraft.id,
      },
    );
  typia.assert(submittedTimesheet);
  const before = timelog;
  await TestValidator.error(
    "timelog deletion must be blocked when timesheet is submitted",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.erase(
        memberConnection,
        {
          timelogId: timelog.id,
        },
      );
    },
  );
  const after = await api.functional.erpHrmTimeTracking.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(after);
  TestValidator.equals("timelog id unchanged", after.id, before.id);
  TestValidator.equals(
    "timelog deleted state unchanged",
    after.deleted_at,
    before.deleted_at,
  );
  TestValidator.equals(
    "timelog duration unchanged",
    after.duration_minutes,
    before.duration_minutes,
  );
  TestValidator.equals(
    "timelog linked to same timesheet",
    after.timesheet?.id ?? null,
    before.timesheet?.id ?? null,
  );
}
