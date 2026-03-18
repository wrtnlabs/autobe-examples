import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_rejection_permission_denied_without_time_approve(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for a member who lacks time:approve
  const memberConnection: api.IConnection = { host: connection.host };
  // Register/join a new member account in an organization context
  const memberEmail: string & import("typia").tags.Format<"email"> =
    typia.random<string & import("typia").tags.Format<"email">>();
  const memberJoinBody = {
    email: memberEmail,
    password: "Password123!",
    organizationName: `org-${typia.random<string & import("typia").tags.Format<"uuid">>()}`,
    organizationDescription: `desc-${typia.random<string>()}`,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 3 as number &
      import("typia").tags.Type<"int32"> &
      import("typia").tags.Minimum<1> &
      import("typia").tags.Maximum<12>,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  // Create a draft timesheet for an employee within the selected org
  const createdTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          // request DTO includes required week boundaries and employee id
          week_start_at: new Date().toISOString(),
          week_end_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "draft",
          // use same authenticated member as employee id context
          erp_hrm_time_tracking_employee_id: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(createdTimesheet);
  // Submit the timesheet
  const submittedTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: createdTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Reject attempt must fail
  const rejectionReason: string & import("typia").tags.MinLength<1> =
    RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "reject denied without time:approve permission",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.reject(
        memberConnection,
        {
          timesheetId: createdTimesheet.id,
          body: {
            rejectionReason,
          } satisfies IErpHrmTimeTrackingTimesheet.IReject,
        },
      );
    },
  );
  // Validate timesheet remains in submitted state and rejectedAt is null
  const afterRejectTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: createdTimesheet.id,
      },
    );
  typia.assert(afterRejectTimesheet);
  TestValidator.equals(
    "status remains submitted",
    afterRejectTimesheet.status,
    submittedTimesheet.status,
  );
  TestValidator.equals(
    "rejectedAt remains null",
    afterRejectTimesheet.rejectedAt,
    null,
  );
}
