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
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_timezone_rebuild_isolation_between_organizations(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Rebuild is org-scoped and must not affect derived interpretations in other organizations.
  // 1) Setup: register one member
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd!";
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
    organizationName: `boot-${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: memberJoinInput,
  });
  typia.assert(authorized);
  // 2) Create two organizations (Org A & Org B)
  const orgA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `OrgA-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          logo_url: null,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgA);
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `OrgB-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: "KRW",
          timezone: "America/Los_Angeles",
          fiscal_start_month: 1,
          logo_url: null,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(orgB);
  // 3) Change only Org A timezone
  // No organization-update DTO/endpoint is provided in the input materials.
  // This test focuses on strict organization-scoped behavior of the rebuild endpoint.
  // 4) Rebuild Org A only
  await api.functional.erpHrmTimeTracking.member.organizations.timezone.rebuild.processTimezoneRebuild(
    memberConnection,
    {
      body: {
        id: orgA.id,
        page: null,
        limit: null,
      } satisfies IErpHrmTimeTrackingOrganization.IRequest,
    },
  );
  // 5) Validate isolation (limited by available endpoints):
  // - If rebuild had cross-tenant side effects, rebuilding Org B afterward might fail.
  // - Both rebuild calls must succeed independently.
  await api.functional.erpHrmTimeTracking.member.organizations.timezone.rebuild.processTimezoneRebuild(
    memberConnection,
    {
      body: {
        id: orgB.id,
        page: null,
        limit: null,
      } satisfies IErpHrmTimeTrackingOrganization.IRequest,
    },
  );
}
