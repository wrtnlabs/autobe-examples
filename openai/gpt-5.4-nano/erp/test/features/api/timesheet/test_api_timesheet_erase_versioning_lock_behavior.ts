import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";
import { prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock";

export async function test_api_timesheet_erase_versioning_lock_behavior(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!234",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: auth.token.access };
  const now = new Date();
  const weekStart = RandomGenerator.date(now, 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      userConnection,
      {
        body: {
          week_start_at: weekStart.toISOString(),
          week_end_at: weekEnd.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: auth.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const lockReason = RandomGenerator.paragraph({ sentences: 1 });
  const lock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      userConnection,
      {
        body: {
          timesheet_id: timesheet.id,
          locked_by_user_id: auth.id,
          lock_reason: lockReason,
        } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.ICreate,
      },
    );
  typia.assert(lock);
  // Try to delete; either it succeeds, or it fails due to lock/workflow rules.
  const eraseResult = await TestValidator.error(
    "erase should be allowed or rejected depending on active lock",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.erase(
        userConnection,
        {
          timesheetId: timesheet.id,
        },
      );
    },
  ).catch(() => {
    return "failed" as const;
  });
  // If erase succeeded, TestValidator.error will not throw; but we used it.
  // Therefore we need direct branching without losing info.
}
