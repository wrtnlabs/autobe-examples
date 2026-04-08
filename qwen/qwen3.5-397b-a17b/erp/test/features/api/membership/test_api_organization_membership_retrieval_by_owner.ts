import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationMembership";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationMembership";
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
 * Test that a member can successfully retrieve their own organization membership record where they are the owner.
 *
 * Validates the complete membership retrieval flow including member authentication, organization creation with automatic ownership assignment, membership list retrieval to obtain the membership ID, and individual membership record retrieval. Ensures that the membership correctly reflects ownership status and contains all required nested member and organization data.
 *
 * Special attention is given to verifying that the is_owner flag is true for the organization creator, that the membership is active (deleted_at is null), and that all nested summary objects contain the expected identification and configuration fields.
 *
 * 1. Member registers with email and password via authorize_member_join utility.
 * 2. Member creates organization via generate_random_hrm_platform_member_organizations_create utility (automatically becomes owner).
 * 3. Retrieve membership list to obtain the membership ID for the created organization.
 * 4. Call GET /hrmPlatform/member/memberships/{membershipId} to retrieve full membership details.
 * 5. Validate membership record contains correct ownership status, active state, and nested member/organization data.
 */
export async function test_api_organization_membership_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (member automatically becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Retrieve membership list to get the membership ID
  const membershipsResponse =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          hrm_platform_organization_id: organization.id,
          is_owner: true,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(membershipsResponse);
  // Get the membership ID from the first result
  TestValidator.predicate(
    "has at least one membership",
    membershipsResponse.data.length > 0,
  );
  const membershipSummary = membershipsResponse.data[0];
  const membershipId = membershipSummary.id;
  // 4. Retrieve specific membership by ID
  const membership = await api.functional.hrmPlatform.member.memberships.at(
    memberConnection,
    {
      membershipId: membershipId,
    },
  );
  typia.assert(membership);
  // 5. Validate membership record
  TestValidator.equals("membership ID matches", membership.id, membershipId);
  TestValidator.predicate("is owner is true", membership.is_owner === true);
  TestValidator.predicate(
    "membership is active (not deleted)",
    membership.deleted_at === null,
  );
  TestValidator.equals(
    "member ID matches auth",
    membership.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches auth",
    membership.member.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "organization ID matches",
    membership.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    membership.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency matches",
    membership.organization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    membership.organization.timezone,
    organization.timezone,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    membership.created_at !== null && membership.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    membership.updated_at !== null && membership.updated_at !== undefined,
  );
}
