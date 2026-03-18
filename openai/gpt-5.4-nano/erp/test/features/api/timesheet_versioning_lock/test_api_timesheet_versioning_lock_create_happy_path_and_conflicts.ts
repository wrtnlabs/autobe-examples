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

export async function test_api_timesheet_versioning_lock_create_happy_path_and_conflicts(
  connection: api.IConnection,
): Promise<void> {
  const lockReasonA = `lock-reason-${Math.random().toString(16).slice(2)}`;
  const lockReasonB = `lock-reason-b-${Math.random().toString(16).slice(2)}`;
  const memberConnectionA: api.IConnection = { host: connection.host };
  const memberA: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnectionA, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `Pass-${RandomGenerator.alphabets(10)}`,
        organizationName: RandomGenerator.name(2),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "KRW",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/",
        referrer: "https://example.com/referrer",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(memberA);
  const now = new Date();
  const weekStart = now;
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const editableTimesheet: IErpHrmTimeTrackingTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionA,
      {
        body: {
          week_start_at: weekStart.toISOString(),
          week_end_at: weekEnd.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: memberA.id,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(editableTimesheet);
  const lockA: IErpHrmTimeTrackingTimesheetVersioningLock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberConnectionA,
      {
        body: {
          timesheet_id: editableTimesheet.id,
          locked_by_user_id: memberA.id,
          lock_reason: lockReasonA,
        } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.ICreate,
      },
    );
  typia.assert(lockA);
  TestValidator.equals(
    "timesheet_id matches",
    lockA.timesheet_id,
    editableTimesheet.id,
  );
  TestValidator.equals(
    "locked_by_user_id matches",
    lockA.locked_by_user_id,
    memberA.id,
  );
  TestValidator.equals("deleted_at is null", lockA.deleted_at, null);
  const memberConnectionB: api.IConnection = { host: connection.host };
  const memberB: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnectionB, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `Pass-${RandomGenerator.alphabets(10)}`,
        organizationName: RandomGenerator.name(2),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "KRW",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/",
        referrer: "https://example.com/referrer",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(memberB);
  await TestValidator.error(
    "second lock creation denied for same timesheet",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
        memberConnectionB,
        {
          body: {
            timesheet_id: editableTimesheet.id,
            locked_by_user_id: memberB.id,
            lock_reason: lockReasonB,
          } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.ICreate,
        },
      );
    },
  );
  TestValidator.equals("original lock remains active", lockA.deleted_at, null);
  const timesheetForApproval: IErpHrmTimeTrackingTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionA,
      {
        body: {
          week_start_at: weekStart.toISOString(),
          week_end_at: weekEnd.toISOString(),
          status: "submitted",
          erp_hrm_time_tracking_employee_id: memberA.id,
          submitted_at: new Date().toISOString(),
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheetForApproval);
  const approvedTimesheet: IErpHrmTimeTrackingTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.approve.approveTimesheet(
      memberConnectionA,
      {
        timesheetId: timesheetForApproval.id,
        body: {
          notes: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IErpHrmTimeTrackingTimesheet.IApprove,
      },
    );
  typia.assert(approvedTimesheet);
  await TestValidator.error(
    "lock creation denied after timesheet approval",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
        memberConnectionA,
        {
          body: {
            timesheet_id: approvedTimesheet.id,
            locked_by_user_id: memberA.id,
            lock_reason: `after-approval-${lockReasonA}`,
          } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.ICreate,
        },
      );
    },
  );
}
