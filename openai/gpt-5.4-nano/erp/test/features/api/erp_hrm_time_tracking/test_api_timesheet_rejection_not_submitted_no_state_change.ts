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

export async function test_api_timesheet_rejection_not_submitted_no_state_change(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const credentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
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
  const joined = await authorize_member_join(memberJoinConnection, {
    body: credentials,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joined.token.access,
  };
  const weekStart = new Date();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const initialTimesheet: IErpHrmTimeTrackingTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          week_start_at: weekStart.toISOString(),
          week_end_at: weekEnd.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: joined.id satisfies string &
            tags.Format<"uuid">,
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        } satisfies DeepPartial<IErpHrmTimeTrackingTimesheet.ICreate>,
      },
    );
  typia.assert(initialTimesheet);
  const before = initialTimesheet;
  await TestValidator.error(
    "cannot reject timesheet when not submitted",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.reject(
        memberConnection,
        {
          timesheetId: before.id,
          body: {
            rejectionReason: RandomGenerator.paragraph({
              sentences: 1,
            }) satisfies string,
          } satisfies IErpHrmTimeTrackingTimesheet.IReject,
        },
      );
    },
  );
  // Without a timesheet re-fetch endpoint in the provided API surface,
  // validate that the created timesheet was still the same draft state.
  TestValidator.equals("status is draft", before.status, "draft");
  TestValidator.equals("rejectedAt is null", before.rejectedAt, null);
  TestValidator.equals("submittedAt is null", before.submittedAt, null);
  TestValidator.equals("approvedAt is null", before.approvedAt, null);
}
