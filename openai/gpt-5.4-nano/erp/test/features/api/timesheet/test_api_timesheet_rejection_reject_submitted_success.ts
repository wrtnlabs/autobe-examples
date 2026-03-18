import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
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
import { generate_random_erp_hrm_time_tracking_member_activity_log_entries_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entries_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_rejection_reject_submitted_success(
  connection: api.IConnection,
): Promise<void> {
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = `Pass_${RandomGenerator.alphabets(16)}`;
  const organizationName = `org_${RandomGenerator.alphabets(8)}`;
  const reviewerAuthorized = await authorize_member_join(reviewerConnection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      organizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(reviewerAuthorized);
  const now = new Date();
  const weekStartAt = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const weekEndAt = now.toISOString();
  const employeeId = reviewerAuthorized.id;
  const timesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.createTimesheet(
      reviewerConnection,
      {
        body: {
          week_start_at: weekStartAt,
          week_end_at: weekEndAt,
          status: "submitted",
          erp_hrm_time_tracking_employee_id: employeeId,
          submitted_at: now.toISOString(),
          approved_at: null,
          rejected_at: null,
        } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  TestValidator.equals(
    "initial status is submitted",
    timesheet.status,
    "submitted",
  );
  const rejectionReason = `Rejected: ${RandomGenerator.paragraph({ sentences: 1 })}`;
  const beforeRejectedAt = timesheet.rejectedAt;
  const rejected =
    await api.functional.erpHrmTimeTracking.member.timesheets.reject(
      reviewerConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejectionReason,
        } satisfies IErpHrmTimeTrackingTimesheet.IReject,
      },
    );
  typia.assert(rejected);
  TestValidator.equals("status becomes draft", rejected.status, "draft");
  TestValidator.predicate(
    "rejectedAt is non-null",
    rejected.rejectedAt !== null,
  );
  TestValidator.notEquals(
    "rejectedAt changed",
    beforeRejectedAt,
    rejected.rejectedAt,
  );
  TestValidator.predicate(
    "submittedAt remains non-null",
    rejected.submittedAt !== null,
  );
  if (timesheet.approvedAt !== null) {
    TestValidator.equals(
      "approvedAt preserved",
      rejected.approvedAt,
      timesheet.approvedAt,
    );
  }
  TestValidator.equals(
    "organization scoping preserved",
    rejected.erpHrmTimeTrackingOrganizationId,
    timesheet.erpHrmTimeTrackingOrganizationId,
  );
  // Audit trail assertion
  // No audit log query/list endpoint is available in the provided API surface.
  // Therefore we cannot fetch and validate the rejection activity log entry.
}
