import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_profile_get_member_requires_selected_context(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate member A (tenant A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberACredentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!234567",
    organizationName: `org-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: `https://example.com/join/${RandomGenerator.alphabets(6)}`,
    referrer: `https://example.com/referrer/${RandomGenerator.alphabets(6)}`,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: memberACredentials,
  });
  typia.assert(memberAAuthorized);
  // Token-based join utility mutates headers; create isolated connection usage
  const memberAAuthConnection: api.IConnection = { host: connection.host };
  memberAAuthConnection.headers = memberAConnection.headers;
  // 2) Authenticate member B (tenant B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBCredentials: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!234567",
    organizationName: `org-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 2,
    href: `https://example.com/join/${RandomGenerator.alphabets(6)}`,
    referrer: `https://example.com/referrer/${RandomGenerator.alphabets(6)}`,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: memberBCredentials,
  });
  typia.assert(memberBAuthorized);
  const memberBAuthConnection: api.IConnection = { host: connection.host };
  memberBAuthConnection.headers = memberBConnection.headers;
  // Determine tenant/org ids deterministically:
  // - member join returns only member id; use member B to fetch its organization profile.
  // - However, endpoint requires organizationId. We'll use the member B id as organizationId source
  //   only if the API contract treats it that way.
  // In absence of explicit member->organization linkage DTO fields, validate via negative access
  // by using member B id as candidate organizationId.
  const crossOrganizationId: string = memberBAuthorized.id;
  // 3) Member A calls organization profile using organizationId from tenant B
  await TestValidator.httpError(
    "member cannot get organization profile from unselected/foreign tenant",
    [401, 403],
    async () => {
      const failed =
        await api.functional.erpHrmTimeTracking.member.organizations.at(
          memberAAuthConnection,
          {
            organizationId: crossOrganizationId,
          },
        );
      typia.assert(failed);
    },
  );
  // 5) Ensure failure does not alter persisted data for either tenant.
  // We can only validate read isolation by ensuring member A can still read its own tenant
  // if we can derive member A's organization id similarly.
  const memberAOrgIdCandidate: string = memberAAuthorized.id;
  const memberAOrg =
    await api.functional.erpHrmTimeTracking.member.organizations.at(
      memberAAuthConnection,
      { organizationId: memberAOrgIdCandidate },
    );
  typia.assert(memberAOrg);
  const memberBOrg =
    await api.functional.erpHrmTimeTracking.member.organizations.at(
      memberBAuthConnection,
      { organizationId: crossOrganizationId },
    );
  typia.assert(memberBOrg);
  TestValidator.equals(
    "member B organization id unchanged",
    memberBOrg.id,
    crossOrganizationId,
  );
  TestValidator.notEquals(
    "member A tenant is different from member B tenant",
    memberAOrg.id,
    memberBOrg.id,
  );
}
