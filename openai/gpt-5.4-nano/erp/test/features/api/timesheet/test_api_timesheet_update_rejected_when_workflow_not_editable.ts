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

export async function test_api_timesheet_update_rejected_when_workflow_not_editable(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (join)
  const baseConnection: api.IConnection = { host: connection.host };
  const credentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const joinResult: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(baseConnection, { body: credentials });
  typia.assert(joinResult);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = baseConnection.headers;
  // 2) Create a weekly timesheet
  const created: IErpHrmTimeTrackingTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {},
    );
  typia.assert(created);
  // 3) Submit the timesheet to make it non-editable
  const submitted: IErpHrmTimeTrackingTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      { timesheetId: created.id },
    );
  typia.assert(submitted);
  const pre = {
    status: submitted.status,
    submittedAt: submitted.submittedAt,
    approvedAt: submitted.approvedAt,
    rejectedAt: submitted.rejectedAt,
  } satisfies {
    status: string;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
  };
  // 4) Attempt to update while workflow is non-editable
  // Mutate workflow fields with valid types to ensure this is not a no-op.
  const mutatedStatus: string = `${pre.status}_mutation_attempt`;
  const updateBody: IErpHrmTimeTrackingTimesheet.IUpdate = {
    status: mutatedStatus,
    submitted_at: pre.submittedAt,
    approved_at: pre.approvedAt,
    rejected_at: pre.rejectedAt,
  } satisfies IErpHrmTimeTrackingTimesheet.IUpdate;
  await TestValidator.error(
    "timesheet update should be rejected for non-editable workflow state",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.update(
        memberConnection,
        {
          timesheetId: created.id,
          body: updateBody,
        },
      );
    },
  );
  // 5) Re-read: no dedicated GET endpoint is available in provided SDK list.
  // Use submit as a closest safe re-fetch attempt; if it is idempotent and returns the timesheet,
  // compare workflow fields remain unchanged.
  const after: IErpHrmTimeTrackingTimesheet =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      { timesheetId: created.id },
    );
  typia.assert(after);
  TestValidator.equals("status unchanged", after.status, pre.status);
  TestValidator.equals(
    "submittedAt unchanged",
    after.submittedAt,
    pre.submittedAt,
  );
  TestValidator.equals(
    "approvedAt unchanged",
    after.approvedAt,
    pre.approvedAt,
  );
  TestValidator.equals(
    "rejectedAt unchanged",
    after.rejectedAt,
    pre.rejectedAt,
  );
}
