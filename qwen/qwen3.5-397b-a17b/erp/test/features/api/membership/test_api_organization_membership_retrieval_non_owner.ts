import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization membership retrieval for a non-owner member.
 *
 * Validates that a regular member (not the organization owner) can successfully retrieve their own organization membership record. The test establishes an organization with an owner, invites a second member to join, and verifies that the second member can access their membership details with correct ownership status.
 *
 * The test ensures proper isolation between owner and regular member permissions, confirming that the is_owner flag accurately reflects membership role and that all membership data is correctly returned for non-owner members.
 *
 * 1. First member registers and creates organization as owner.
 * 2. Second member registers with unique credentials.
 * 3. First member invites second member to the organization via employee invitation.
 * 4. Second member retrieves their membership list to obtain membership ID.
 * 5. Second member calls GET /hrmPlatform/member/memberships/{membershipId} to retrieve their membership.
 * 6. Validates membership record contains correct is_owner flag (false), member details, and organization reference.
 */
export async function test_api_organization_membership_retrieval_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (owner) and create organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Register second member (regular member) before invitation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. First member invites second member to organization
  // Since second member already has an account, they will be immediately added as an employee
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: memberEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: futureDate.toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Second member retrieves their membership list to get membership ID
  const membershipsPage =
    await api.functional.hrmPlatform.member.memberships.index(
      memberConnection,
      {
        body: {
          hrm_platform_organization_id: organization.id,
          limit: 10,
        } satisfies IHrmPlatformOrganizationMembership.IRequest,
      },
    );
  typia.assert(membershipsPage);
  // Find the membership for the second member (should be the one with isOwner: false)
  const memberMembership = membershipsPage.data.find(
    (m) => m.member.id === memberAuth.id && m.isOwner === false,
  );
  TestValidator.predicate(
    "second member has membership in organization",
    () => memberMembership !== undefined,
  );
  if (!memberMembership) {
    throw new Error("Second member membership not found in organization");
  }
  // 5. Second member retrieves their specific membership by ID
  const membership = await api.functional.hrmPlatform.member.memberships.at(
    memberConnection,
    {
      membershipId: memberMembership.id,
    },
  );
  typia.assert(membership);
  // 6. Validate membership details
  TestValidator.equals(
    "membership ID matches requested ID",
    membership.id,
    memberMembership.id,
  );
  TestValidator.equals(
    "is_owner is false for regular member",
    membership.is_owner,
    false,
  );
  TestValidator.equals(
    "deleted_at is null for active membership",
    membership.deleted_at,
    null,
  );
  TestValidator.equals(
    "member ID matches authenticated user",
    membership.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches registration email",
    membership.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "organization ID matches created organization",
    membership.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    membership.organization.name,
    organization.name,
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    () =>
      typeof membership.created_at === "string" &&
      membership.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    () =>
      typeof membership.updated_at === "string" &&
      membership.updated_at.length > 0,
  );
}
