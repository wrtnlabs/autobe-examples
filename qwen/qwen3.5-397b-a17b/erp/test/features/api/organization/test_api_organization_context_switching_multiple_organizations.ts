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

export async function test_api_organization_context_switching_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first organization
  const org1 =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org1);
  // 3. Create second organization for the same member
  const org2 =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(org2);
  // 4. Select first organization context
  const selectedOrg1 =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: org1.id,
      },
    );
  typia.assert(selectedOrg1);
  // 5. Validate first organization selection
  TestValidator.equals(
    "first organization ID matches",
    selectedOrg1.id,
    org1.id,
  );
  TestValidator.equals(
    "first organization name matches",
    selectedOrg1.name,
    org1.name,
  );
  // 6. Switch to second organization context (without re-authentication)
  const selectedOrg2 =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: org2.id,
      },
    );
  typia.assert(selectedOrg2);
  // 7. Validate second organization selection
  TestValidator.equals(
    "second organization ID matches",
    selectedOrg2.id,
    org2.id,
  );
  TestValidator.equals(
    "second organization name matches",
    selectedOrg2.name,
    org2.name,
  );
  // 8. Verify organizations are distinct
  TestValidator.notEquals("organizations have different IDs", org1.id, org2.id);
  TestValidator.notEquals(
    "organizations have different names",
    org1.name,
    org2.name,
  );
  // 9. Verify session remained active throughout (token still valid)
  TestValidator.predicate(
    "access token exists",
    memberAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    memberAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    memberAuth.token.expired_at.length > 0,
  );
}