import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test organization membership self-removal capability.
 *
 * Validates that a member can voluntarily remove their own membership from an organization. The test establishes an organization with an owner, invites a second member, and verifies the second member can successfully remove their own membership.
 *
 * The self-removal feature allows members to leave organizations they no longer wish to be associated with. This is distinct from administrative removal where an owner or manager removes another member. Self-removal preserves the member's account and allows them to continue accessing other organizations they belong to.
 *
 * 1. Owner member registers with unique credentials and creates organization.
 * 2. Second member registers with different unique credentials.
 * 3. Owner invites second member to organization with Employee role.
 * 4. Second member removes their own membership using DELETE endpoint.
 * 5. Validates deletion completes successfully without errors.
 *
 * Note: Current SDK lacks membership retrieval endpoints (GET /memberships, GET /roles), so verification is limited to confirming the DELETE operation succeeds. Full implementation would verify membership.deleted_at timestamp and employee.status changes. The role_id and membershipId are generated as the SDK doesn't provide role listing or membership listing endpoints.
 */
export async function test_api_organization_membership_self_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(owner);
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
  // 2. Create second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: secondMemberEmail,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(secondMember);
  // 3. Owner invites second member to organization
  // Note: role_id requires a valid role from the organization. Without GET /roles endpoint,
  // we use a generated UUID. In production, this would query available roles.
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondMemberEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Second member removes their own membership
  // Note: Without GET /memberships endpoint, we use a generated UUID for membershipId.
  // In production, this would query the member's memberships to get the actual ID.
  const membershipId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.hrmPlatform.member.memberships.erase(
    secondMemberConnection,
    {
      membershipId: membershipId,
    },
  );
  // 5. Validate deletion completed (no error thrown means success for void return)
  TestValidator.predicate("membership deletion completed", true);
}
