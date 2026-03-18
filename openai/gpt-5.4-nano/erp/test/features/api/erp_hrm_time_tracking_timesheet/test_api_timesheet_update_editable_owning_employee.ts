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

export async function test_api_timesheet_update_editable_owning_employee(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Ensure simulation mode propagates if enabled
  if (connection.simulate) memberConnection.simulate = true;
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
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
  await authorize_member_join(memberConnection, { body: joinBody });
  // We need an existing timesheet belonging to this member.
  // Without a provided timesheet creation/list endpoint, the only reliable option
  // is to run in simulation mode (handled by SDK/connection).
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    status: "draft",
    submitted_at: null,
    approved_at: null,
    rejected_at: null,
  } satisfies IErpHrmTimeTrackingTimesheet.IUpdate;
  const updated =
    await api.functional.erpHrmTimeTracking.member.timesheets.update(
      memberConnection,
      {
        timesheetId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("status matches", updated.status, updateBody.status);
  if (updated.status === "draft") {
    TestValidator.equals(
      "submittedAt is null for draft",
      updated.submittedAt,
      null,
    );
    TestValidator.equals(
      "approvedAt is null for draft",
      updated.approvedAt,
      null,
    );
    TestValidator.equals(
      "rejectedAt is null for draft",
      updated.rejectedAt,
      null,
    );
  }
  // Negative scenario: attempt a transition that should be rejected when the timesheet is not editable.
  const nonEditableAttempt = {
    status: "approved",
    submitted_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    rejected_at: null,
  } satisfies IErpHrmTimeTrackingTimesheet.IUpdate;
  await TestValidator.error(
    "rejects update when timesheet is not editable (non-editable status transition)",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.update(
        memberConnection,
        {
          timesheetId,
          body: nonEditableAttempt,
        },
      );
    },
  );
}
