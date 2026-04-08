import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_organization_cross_org_access_boundary(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member and create Org A (initial organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    },
  });
  typia.assert(joinResult);
  // Verify session has Org A as active context (first organization created)
  const sessionA = joinResult.sessions?.[0];
  TestValidator.predicate(
    "session should have organization context",
    () => sessionA !== undefined && sessionA.organization !== null,
  );
  const orgAId = sessionA?.organization?.id;
  TestValidator.predicate("orgA should have id", () => orgAId !== undefined);
  // Step 2: Create second organization (Org B) using the same member's connection
  // The member's session now has Org A as the active context
  const orgConnection: api.IConnection = { host: connection.host };
  const orgB = await api.functional.hrmPlatform.member.organizations.create(
    orgConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        fiscal_start_month: RandomGenerator.pick([1, 4, 7, 10]),
      },
    },
  );
  typia.assert(orgB);
  // Step 3: Try to retrieve Org B while session context is Org A
  // This should fail with HTTP 404 - organization not accessible in current context
  await TestValidator.httpError(
    "should return 404 for organization outside current context",
    [404],
    async () => {
      await api.functional.hrmPlatform.member.organizations.at(orgConnection, {
        organizationId: orgB.id,
      });
    },
  );
  // Step 4: Verify we can still access Org A (current context)
  const orgARetrieved =
    await api.functional.hrmPlatform.member.organizations.at(orgConnection, {
      organizationId: orgAId!,
    });
  typia.assert(orgARetrieved);
  TestValidator.equals("orgA ID matches", orgARetrieved.id, orgAId);
}
