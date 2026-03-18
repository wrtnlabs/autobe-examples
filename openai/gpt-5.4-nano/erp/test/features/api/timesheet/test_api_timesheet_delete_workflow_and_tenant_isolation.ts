import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
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

export async function test_api_timesheet_delete_workflow_and_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  const password = "Password1!";
  // Member A
  const memberConnectionA: api.IConnection = { host: connection.host };
  const actorA = await authorize_member_join(memberConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(actorA);
  // Member B
  const memberConnectionB: api.IConnection = { host: connection.host };
  const actorB = await authorize_member_join(memberConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(actorB);
  // Base week window
  const weekStartA = RandomGenerator.date(new Date(), 0);
  const weekEndA = new Date(weekStartA.getTime() + 6 * 24 * 60 * 60 * 1000);
  // Scenario 1: Delete draft timesheet succeeds
  const ts1 =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionA,
      {
        body: {
          week_start_at: weekStartA.toISOString(),
          week_end_at: weekEndA.toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: actorA.id satisfies string &
            tags.Format<"uuid">,
        },
      },
    );
  typia.assert(ts1);
  // If server didn't keep it in draft, try to reject to make it eligible.
  if (ts1.status !== "draft" && ts1.status !== "rejected") {
    const ts1Rejected =
      await api.functional.erpHrmTimeTracking.member.timesheets.reject(
        memberConnectionA,
        {
          timesheetId: ts1.id,
          body: {
            rejectionReason: "Needs changes" satisfies string &
              tags.MinLength<1>,
          } satisfies IErpHrmTimeTrackingTimesheet.IReject,
        },
      );
    typia.assert(ts1Rejected);
    await api.functional.erpHrmTimeTracking.member.timesheets.erase(
      memberConnectionA,
      { timesheetId: ts1Rejected.id },
    );
    await TestValidator.error(
      "deleting the same draft/rejected timesheet twice should be rejected",
      async () => {
        await api.functional.erpHrmTimeTracking.member.timesheets.erase(
          memberConnectionA,
          { timesheetId: ts1Rejected.id },
        );
      },
    );
  } else {
    await api.functional.erpHrmTimeTracking.member.timesheets.erase(
      memberConnectionA,
      { timesheetId: ts1.id },
    );
    await TestValidator.error(
      "deleting the same draft/rejected timesheet twice should be rejected",
      async () => {
        await api.functional.erpHrmTimeTracking.member.timesheets.erase(
          memberConnectionA,
          { timesheetId: ts1.id },
        );
      },
    );
  }
  // Scenario 2: Delete approved timesheet is rejected (immutability)
  const ts2 =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionA,
      {
        body: {
          week_start_at: new Date(
            weekStartA.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          week_end_at: new Date(
            weekEndA.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "submitted",
          erp_hrm_time_tracking_employee_id: actorA.id satisfies string &
            tags.Format<"uuid">,
        },
      },
    );
  typia.assert(ts2);
  const ts2Approved =
    await api.functional.erpHrmTimeTracking.member.timesheets.approve.approveTimesheet(
      memberConnectionA,
      {
        timesheetId: ts2.id,
        body: {
          notes: "Approved for workflow test" satisfies string &
            tags.MaxLength<80000>,
        } satisfies IErpHrmTimeTrackingTimesheet.IApprove,
      },
    );
  typia.assert(ts2Approved);
  await TestValidator.error(
    "deleting an approved timesheet should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.erase(
        memberConnectionA,
        { timesheetId: ts2Approved.id },
      );
    },
  );
  await TestValidator.error(
    "rejecting an approved timesheet should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.reject(
        memberConnectionA,
        {
          timesheetId: ts2Approved.id,
          body: {
            rejectionReason: "Not allowed" satisfies string & tags.MinLength<1>,
          } satisfies IErpHrmTimeTrackingTimesheet.IReject,
        },
      );
    },
  );
  // Scenario 3: Tenant isolation deleting from other organization is rejected
  // Create a separate undeleted draft timesheet in member A
  const ts3A =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionA,
      {
        body: {
          week_start_at: new Date(
            weekStartA.getTime() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          week_end_at: new Date(
            weekEndA.getTime() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: actorA.id satisfies string &
            tags.Format<"uuid">,
        },
      },
    );
  typia.assert(ts3A);
  // Ensure member B has its own context by creating a timesheet
  const ts3B =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnectionB,
      {
        body: {
          week_start_at: new Date(
            weekStartA.getTime() + 21 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          week_end_at: new Date(
            weekEndA.getTime() + 21 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "draft",
          erp_hrm_time_tracking_employee_id: actorB.id satisfies string &
            tags.Format<"uuid">,
        },
      },
    );
  typia.assert(ts3B);
  await TestValidator.error(
    "deleting a timesheet from another organization should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.erase(
        memberConnectionB,
        { timesheetId: ts3A.id },
      );
    },
  );
  // Cleanup: ts3A should still be deletable from member A
  await api.functional.erpHrmTimeTracking.member.timesheets.erase(
    memberConnectionA,
    { timesheetId: ts3A.id },
  );
  // Cleanup: ts3B
  await api.functional.erpHrmTimeTracking.member.timesheets.erase(
    memberConnectionB,
    { timesheetId: ts3B.id },
  );
}
