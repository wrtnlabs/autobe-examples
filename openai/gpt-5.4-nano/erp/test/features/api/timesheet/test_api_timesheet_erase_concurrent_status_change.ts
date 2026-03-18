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

export async function test_api_timesheet_erase_concurrent_status_change(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "StrongPassword!234";
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const timesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          submitted_at: null,
          approved_at: null,
          rejected_at: null,
        },
      },
    );
  typia.assert(timesheet);
  const timesheetId = timesheet.id;
  const eraseFlow = async (): Promise<void> => {
    await api.functional.erpHrmTimeTracking.member.timesheets.erase(
      memberConnection,
      { timesheetId },
    );
  };
  const submitFlow = async (): Promise<IErpHrmTimeTrackingTimesheet> => {
    return await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      memberConnection,
      { timesheetId },
    );
  };
  // Concurrently try to erase while submitting.
  // If status becomes non-deletable during erase, erase must be rejected.
  const [eraseResult, submitResult] = await Promise.allSettled([
    eraseFlow(),
    submitFlow(),
  ]);
  if (eraseResult.status === "fulfilled") {
    // If deletion succeeded, timesheet should no longer be submit-able.
    await TestValidator.error(
      "submit after successful erase should fail",
      async () => {
        await api.functional.erpHrmTimeTracking.member.timesheets.submit(
          memberConnection,
          { timesheetId },
        );
      },
    );
  } else {
    // If deletion was rejected, it should be because workflow status changed.
    // Submission should either succeed (status moved forward) or already be in a terminal workflow state.
    TestValidator.predicate(
      "erase should be rejected under concurrent workflow change",
      () => submitResult.status !== "rejected",
    );
  }
}
