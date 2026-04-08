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
 * Test organization membership list retrieval for authenticated member.
 *
 * Validates the complete membership list retrieval workflow including member authentication, organization creation, and paginated membership listing. Ensures that the membership endpoint returns correctly structured data with proper organization association and ownership status.
 *
 * Special attention is given to verifying that the membership record contains all required fields (id, isOwner, member, organization, createdAt) and that pagination metadata accurately reflects the dataset. The test confirms that a member who creates an organization automatically becomes the owner with isOwner set to true.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates a new organization which automatically creates membership record.
 * 3. Member retrieves their organization memberships list via paginated endpoint.
 * 4. Validates membership structure includes id, isOwner, member, organization, and createdAt fields.
 * 5. Validates pagination metadata includes current, limit, records, and pages fields.
 * 6. Confirms membership shows correct organization association and owner status.
 */
export async function test_api_organization_membership_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
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
  // 2. Create organization (automatically creates membership with owner status)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP"]),
          timezone: RandomGenerator.pick([
            "Asia/Seoul",
            "America/New_York",
            "Europe/London",
          ]),
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Retrieve membership list
  const membershipList =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(membershipList);
  // 4. Validate pagination metadata values
  TestValidator.equals(
    "current page is 1",
    membershipList.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    membershipList.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "has at least 1 record",
    membershipList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "has at least 1 page",
    membershipList.pagination.pages >= 1,
  );
  // 5. Validate membership data exists
  TestValidator.predicate(
    "has at least one membership",
    membershipList.data.length >= 1,
  );
  const membership = membershipList.data[0]!;
  typia.assert(membership);
  // 6. Validate ownership status (business logic)
  TestValidator.predicate(
    "isOwner is true for organization creator",
    membership.isOwner === true,
  );
  // 7. Validate member association
  TestValidator.equals(
    "member id matches authenticated user",
    membership.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches authenticated user",
    membership.member.email,
    memberAuth.email,
  );
  // 8. Validate organization association
  TestValidator.equals(
    "organization id matches created organization",
    membership.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches created organization",
    membership.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency matches created organization",
    membership.organization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches created organization",
    membership.organization.timezone,
    organization.timezone,
  );
  // 9. Validate timestamps exist (business validation, not type)
  TestValidator.predicate(
    "membership has createdAt timestamp",
    membership.createdAt !== undefined,
  );
  TestValidator.predicate(
    "member has created_at timestamp",
    membership.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "organization has created_at timestamp",
    membership.organization.created_at !== undefined,
  );
}
