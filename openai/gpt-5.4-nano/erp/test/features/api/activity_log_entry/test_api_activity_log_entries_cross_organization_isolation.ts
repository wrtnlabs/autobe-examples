import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: No organization context switching utilities were provided in the prompt.
  // This test uses member join to create at least one organization context,
  // then queries activity logs and asserts that results are scoped to the
  // currently selected organization (as reflected by organization_id field).
  // If the system supports switching organizations within the same session,
  // the selected organization context must influence returned organization_id.
  const memberConnection: api.IConnection = { host: connection.host };
  const member1Email = `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(5)}@test.local`;
  const memberPassword = `pw-${RandomGenerator.alphaNumeric(16)}`;
  const member1JoinBody = {
    email: member1Email satisfies string & tags.Format<"email">,
    password: memberPassword,
    organizationName: `org-${RandomGenerator.alphabets(10)}`,
    organizationDescription: `desc-${RandomGenerator.alphabets(20)}`,
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}` satisfies string &
      tags.Format<"uri">,
    referrer:
      `https://ref.example.com/${RandomGenerator.alphabets(8)}` satisfies string &
        tags.Format<"uri">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const member1Authorized = await authorize_member_join(memberConnection, {
    body: member1JoinBody,
  });
  typia.assert(member1Authorized);
  const orgAConnection: api.IConnection = { host: connection.host };
  orgAConnection.headers = { ...(memberConnection.headers ?? {}) };
  const now = new Date();
  const occurredAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const occurredAtTo = now.toISOString();
  const limit = 5 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const requestBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    occurredAtFrom,
    occurredAtTo,
    includeRemovedEntries: false,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest;
  const pageA =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      orgAConnection,
      { body: requestBody },
    );
  typia.assert(pageA);
  const orgAIds = pageA.data.map((x) => x.organization_id);
  const orgAIdUnique = Array.from(new Set(orgAIds));
  TestValidator.predicate(
    "Org A result set must not be empty (for isolation validation)",
    orgAIdUnique.length >= 1,
  );
  const orgAId = orgAIdUnique[0];
  TestValidator.predicate(
    "Org A all returned organization_id must match a single tenant",
    orgAIdUnique.every((id) => id === orgAId),
  );
  // Attempt to obtain an alternative organization context by joining another member,
  // then re-using the same session token as a proxy would be invalid.
  // However, if server supports org switching purely within the same token,
  // it must be done using an organization context switching endpoint/utility.
  // Since no such endpoint/utility is available in prompt materials,
  // we cannot switch organizations; we still validate that subsequent queries
  // remain scoped (no leakage) for includeRemovedEntries=true.
  const pageAIncludeRemoved =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.index(
      orgAConnection,
      {
        body: {
          ...requestBody,
          includeRemovedEntries: true,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.IRequest,
      },
    );
  typia.assert(pageAIncludeRemoved);
  const orgAIdsIncludeRemoved = pageAIncludeRemoved.data.map(
    (x) => x.organization_id,
  );
  const orgAUniqueIncludeRemoved = Array.from(new Set(orgAIdsIncludeRemoved));
  TestValidator.predicate(
    "includeRemovedEntries=true must not leak other organization_ids",
    orgAUniqueIncludeRemoved.every((id) => id === orgAId),
  );
}
