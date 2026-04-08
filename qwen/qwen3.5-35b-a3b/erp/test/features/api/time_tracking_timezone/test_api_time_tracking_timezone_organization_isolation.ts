import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_time_tracking_timezone_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A with Organization A (created during join)
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberAPassword,
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: "UTC",
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  const memberASummary = memberA.member;
  typia.assert(memberASummary);
  // 2. Create Member B with Organization B (created during join)
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberBPassword,
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: "Asia/Seoul",
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  const memberBSummary = memberB.member;
  typia.assert(memberBSummary);
  // 3. Login with Member B to get Organization B ID from session
  const memberBAuthConnection: api.IConnection = { host: connection.host };
  const memberBLogin = await authorize_member_login(memberBAuthConnection, {
    body: {
      email: memberB.email,
      password: memberBPassword,
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(memberBLogin);
  // Get organization ID from the session's organization field
  const organizationBId = memberBLogin.sessions?.[0]?.organization?.id;
  if (!organizationBId) {
    throw new Error("Organization B ID not found in member B session");
  }
  // 4. Login with Member A to get Organization A ID from session
  const memberAScopedConnection: api.IConnection = { host: connection.host };
  const memberALogin = await authorize_member_login(memberAScopedConnection, {
    body: {
      email: memberA.email,
      password: memberAPassword,
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(memberALogin);
  // Get organization ID from the session's organization field
  const organizationAId = memberALogin.sessions?.[0]?.organization?.id;
  if (!organizationAId) {
    throw new Error("Organization A ID not found in member A session");
  }
  // Query timezone configurations - should only see Organization A's configs
  const timezoneResponse =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberAScopedConnection,
      {
        body: {
          page: 1,
          pageSize: 100,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(timezoneResponse);
  // Validate that only Organization A's timezone configs are returned
  // (Organization B's configs should be filtered out)
  const allOrgAConfigs = timezoneResponse.data.filter(
    (config) => config.organization.id === organizationAId,
  );
  const allOrgBConfigs = timezoneResponse.data.filter(
    (config) => config.organization.id === organizationBId,
  );
  // Member A should only see their own organization's timezone configs
  TestValidator.equals(
    "no member B configs visible to member A",
    allOrgBConfigs.length,
    0,
  );
  // Member A should see their own organization's configs
  TestValidator.equals(
    "member A configs returned",
    allOrgAConfigs.length,
    timezoneResponse.data.length,
  );
}
