import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
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

export async function test_api_organization_list_multi_membership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A and create Organization 1
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Member A creates Organization 1
  const org1Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberA.token.access },
  };
  const organization1 =
    await generate_random_hrm_platform_member_organizations_create(
      org1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization1);
  // 3. Member A lists organizations - should see Organization 1
  const memberAOrgs =
    await api.functional.hrmPlatform.member.organizations.index(
      org1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(memberAOrgs);
  TestValidator.equals(
    "Member A should see 1 organization",
    memberAOrgs.data.length,
    1,
  );
  TestValidator.equals(
    "Organization 1 ID matches",
    memberAOrgs.data[0].id,
    organization1.id,
  );
  // 4. Register member B and create Organization 2
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 5. Member B creates Organization 2
  const org2Connection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberB.token.access },
  };
  const organization2 =
    await generate_random_hrm_platform_member_organizations_create(
      org2Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "EUR",
          timezone: "America/New_York",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(organization2);
  // 6. Member B lists organizations - should see Organization 2
  const memberBOrgs =
    await api.functional.hrmPlatform.member.organizations.index(
      org2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(memberBOrgs);
  TestValidator.equals(
    "Member B should see 1 organization",
    memberBOrgs.data.length,
    1,
  );
  TestValidator.equals(
    "Organization 2 ID matches",
    memberBOrgs.data[0].id,
    organization2.id,
  );
  // 7. Member A lists organizations again - should ONLY see Organization 1 (isolation test)
  const memberAOrgsAfter =
    await api.functional.hrmPlatform.member.organizations.index(
      org1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformOrganization.IRequest,
      },
    );
  typia.assert(memberAOrgsAfter);
  TestValidator.equals(
    "Member A still sees only 1 organization",
    memberAOrgsAfter.data.length,
    1,
  );
  TestValidator.equals(
    "Member A sees Organization 1",
    memberAOrgsAfter.data[0].id,
    organization1.id,
  );
  TestValidator.notEquals(
    "Organizations are isolated",
    organization1.id,
    organization2.id,
  );
  // Verify no cross-organization data leakage
  TestValidator.predicate(
    "Member A cannot see Organization 2",
    () => !memberAOrgsAfter.data.some((org) => org.id === organization2.id),
  );
  TestValidator.predicate(
    "Member B cannot see Organization 1",
    () => !memberBOrgs.data.some((org) => org.id === organization1.id),
  );
}
