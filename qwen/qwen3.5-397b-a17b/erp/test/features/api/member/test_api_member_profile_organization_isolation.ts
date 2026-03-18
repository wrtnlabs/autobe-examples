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

/**
 * Test that organization data isolation is enforced - a member cannot access
 * another member's profile from a different organization.
 *
 * Test Steps:
 * 1. Register the first member and create Organization A
 * 2. Register the second member and create Organization B (separate organization)
 * 3. Use the first member to attempt to call GET /hrmPlatform/members/{memberId}
 *    with the second member's ID
 * 4. Verify the request is rejected due to organization isolation
 *
 * Validation Points:
 * - Request should fail because members belong to different organizations
 * - The system enforces organization context validation
 * - Members can only access profiles of users within their own organization
 * - This validates the multi-tenancy and data isolation requirements
 * - Error response should indicate insufficient access/organization mismatch
 */
export async function test_api_member_profile_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and create Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAAuth);
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 2. Register second member and create Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberBAuth);
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 3. Attempt to access member B's profile from member A's connection
  // This should fail due to organization isolation
  await TestValidator.error(
    "organization isolation prevents cross-org access",
    async () => {
      await api.functional.hrmPlatform.members.at(memberAConnection, {
        memberId: memberBAuth.id,
      });
    },
  );
}
