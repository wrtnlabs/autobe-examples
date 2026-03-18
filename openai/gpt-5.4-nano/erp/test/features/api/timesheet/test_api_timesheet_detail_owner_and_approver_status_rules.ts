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

export async function test_api_timesheet_detail_owner_and_approver_status_rules(
  connection: api.IConnection,
): Promise<void> {
  const baseHost: string = connection.host;
  const seededOwnerDraftTimesheetIdRaw: string | undefined =
    process.env.OWNER_TIMESHEET_ID_DRAFT;
  const seededOwnerSubmittedTimesheetIdRaw: string | undefined =
    process.env.OWNER_TIMESHEET_ID_SUBMITTED;
  const seededApproverDeniedNonSubmittedTimesheetIdRaw: string | undefined =
    process.env.APPROVER_DENIED_NON_SUBMITTED_NON_OWNED_TIMESHEET_ID;
  if (
    seededOwnerDraftTimesheetIdRaw === undefined ||
    seededOwnerSubmittedTimesheetIdRaw === undefined ||
    seededApproverDeniedNonSubmittedTimesheetIdRaw === undefined
  ) {
    throw new Error(
      "Missing required seeded timesheet environment variables: OWNER_TIMESHEET_ID_DRAFT, OWNER_TIMESHEET_ID_SUBMITTED, APPROVER_DENIED_NON_SUBMITTED_NON_OWNED_TIMESHEET_ID",
    );
  }
  const ownerTimesheetIdDraft = typia.assert<string & tags.Format<"uuid">>(
    seededOwnerDraftTimesheetIdRaw,
  );
  const ownerTimesheetIdSubmitted = typia.assert<string & tags.Format<"uuid">>(
    seededOwnerSubmittedTimesheetIdRaw,
  );
  const approverNonOwnedNonSubmittedTimesheetId = typia.assert<
    string & tags.Format<"uuid">
  >(seededApproverDeniedNonSubmittedTimesheetIdRaw);
  // Create a single organization for both the owner and the approver.
  const sharedOrganizationName = `org-${RandomGenerator.alphabets(8)}`;
  const memberConnection: api.IConnection = { host: baseHost };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: sharedOrganizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberTimesheetDraft =
    await api.functional.erpHrmTimeTracking.member.timesheets.at(
      memberConnection,
      {
        timesheetId: ownerTimesheetIdDraft,
      },
    );
  typia.assert(memberTimesheetDraft);
  const memberTimesheetSubmitted =
    await api.functional.erpHrmTimeTracking.member.timesheets.at(
      memberConnection,
      {
        timesheetId: ownerTimesheetIdSubmitted,
      },
    );
  typia.assert(memberTimesheetSubmitted);
  // Business rule: owner can view regardless of workflow status.
  // Timestamp consistency checks based on expected seeded scenario.
  TestValidator.equals(
    "draft timesheet should have submittedAt null",
    memberTimesheetDraft.submittedAt,
    null,
  );
  TestValidator.predicate(
    "submitted timesheet should have submittedAt non-null",
    memberTimesheetSubmitted.submittedAt !== null,
  );
  const approverConnection: api.IConnection = { host: baseHost };
  await authorize_member_join(approverConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: sharedOrganizationName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  await TestValidator.error(
    "approver should be denied for non-owned non-submitted timesheet (safe denial)",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheets.at(
        approverConnection,
        {
          timesheetId: approverNonOwnedNonSubmittedTimesheetId,
        },
      );
    },
  );
}
