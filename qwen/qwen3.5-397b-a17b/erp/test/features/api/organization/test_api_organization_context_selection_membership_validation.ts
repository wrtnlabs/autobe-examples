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
 * Test organization membership validation when selecting an organization context.
 *
 * This test validates the critical security boundary that prevents members from
 * accessing organizations they don't belong to. The test creates two separate
 * member accounts and verifies that one member cannot select another member's
 * organization.
 *
 * Test flow:
 * 1. Register first member (member1) and create an organization
 * 2. Register second member (member2) with different credentials
 * 3. member2 attempts to select member1's organization
 * 4. Validate that the system rejects with 403 Forbidden error
 */
export async function test_api_organization_context_selection_membership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first member and create their organization
  const member1Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member1Auth);
  // Create member1's connection with their auth token
  const member1Connection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member1Auth.token.access}`,
    },
  };
  // Create organization owned by member1
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // Step 2: Register second member (different email)
  const member2Auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // Create member2's connection with their auth token
  const member2Connection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${member2Auth.token.access}`,
    },
  };
  // Step 3: member2 attempts to select member1's organization (should fail)
  await TestValidator.error(
    "member cannot select organization they don't belong to",
    async () => {
      await api.functional.hrmPlatform.member.organizations.select(
        member2Connection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}