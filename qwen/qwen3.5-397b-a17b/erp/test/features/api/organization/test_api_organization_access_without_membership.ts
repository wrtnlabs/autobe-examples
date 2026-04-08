import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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

/**
 * Test that a member cannot access an organization they do not belong to.
 *
 * Validates strict organization data isolation and membership-based access control - a critical multi-tenancy security requirement. Two separate members join the platform, where Member A creates Organization A, then Member B attempts to retrieve Organization A's details using its ID, and the system must reject this request with authorization failure since Member B has no membership in Organization A.
 *
 * 1. Member A joins the platform with unique credentials.
 * 2. Member A creates Organization A with random configuration.
 * 3. Member B joins the platform with different credentials.
 * 4. Member B attempts to access Organization A's details.
 * 5. System rejects the request with 403 Forbidden due to no membership.
 */
export async function test_api_organization_access_without_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins and creates organization
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const organizationA =
    await generate_random_hrm_platform_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // 2. Member B joins with separate credentials
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member B attempts to access Organization A (should fail with 403)
  await TestValidator.httpError(
    "member without membership cannot access organization",
    403,
    async () => {
      await api.functional.hrmPlatform.member.organizations.at(
        memberBConnection,
        {
          organizationId: organizationA.id,
        },
      );
    },
  );
}
