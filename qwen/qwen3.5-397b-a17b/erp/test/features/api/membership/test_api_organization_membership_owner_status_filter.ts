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
 * Test filtering organization memberships by ownership status (is_owner flag).
 *
 * Validates the complete membership ownership filtering workflow including member authentication, organization creation where member becomes owner, and filtering memberships by is_owner status. Ensures that the membership list correctly separates owner and non-owner memberships based on the is_owner filter parameter.
 *
 * Special attention is given to verifying that the isOwner field accurately reflects the ownership status in each membership record and that filtering by is_owner=true returns only memberships where the member is the organization owner.
 *
 * 1. Member authenticates successfully using authorize_member_join utility.
 * 2. Member creates an organization using generate_random_hrm_platform_member_organizations_create utility (automatically becomes owner).
 * 3. Membership list is queried with is_owner=true filter to retrieve only owner memberships.
 * 4. Validates response contains memberships where isOwner field is true.
 * 5. Membership list is queried with is_owner=false filter to retrieve non-owner memberships.
 * 6. Validates results correctly separate owner and non-owner memberships.
 * 7. Each membership record accurately reflects the isOwner boolean status.
 */
export async function test_api_organization_membership_owner_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (member becomes owner)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Query memberships with is_owner=true filter
  const ownerMemberships =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          is_owner: true,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(ownerMemberships);
  // 4. Validate owner memberships contain isOwner=true
  TestValidator.predicate(
    "owner memberships exist",
    ownerMemberships.data.length > 0,
  );
  for (const membership of ownerMemberships.data) {
    TestValidator.equals(
      "isOwner is true for owner memberships",
      membership.isOwner,
      true,
    );
    TestValidator.equals(
      "organization matches created org",
      membership.organization.id,
      organization.id,
    );
  }
  // 5. Query memberships with is_owner=false filter
  const nonOwnerMemberships =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          is_owner: false,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(nonOwnerMemberships);
  // 6. Validate non-owner memberships contain isOwner=false
  for (const membership of nonOwnerMemberships.data) {
    TestValidator.equals(
      "isOwner is false for non-owner memberships",
      membership.isOwner,
      false,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "owner pagination records match data length",
    ownerMemberships.pagination.records >= ownerMemberships.data.length,
  );
  TestValidator.predicate(
    "non-owner pagination records match data length",
    nonOwnerMemberships.pagination.records >= nonOwnerMemberships.data.length,
  );
}
