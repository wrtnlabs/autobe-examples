import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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

export async function test_api_organization_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and create their organization
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  const organization1 =
    await generate_random_hrm_platform_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization1);
  // 2. Register second member and create their organization
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  const organization2 =
    await generate_random_hrm_platform_member_organizations_create(
      member2Connection,
      {},
    );
  typia.assert(organization2);
  // 3. Verify second member can access their own organization
  const ownOrg = await api.functional.hrmPlatform.member.organizations.at(
    member2Connection,
    {
      organizationId: organization2.id,
    },
  );
  typia.assert(ownOrg);
  TestValidator.equals("own organization matches", ownOrg.id, organization2.id);
  // 4. Attempt to access first member's organization as second member (should fail with 404)
  await TestValidator.error("organization access isolation", async () => {
    await api.functional.hrmPlatform.member.organizations.at(
      member2Connection,
      {
        organizationId: organization1.id,
      },
    );
  });
}
