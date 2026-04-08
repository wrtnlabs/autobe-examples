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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test employee invitation expiration date extension update workflow.
 *
 * Validates the ability to extend the expiration date of a pending employee invitation. This test ensures that pending invitations can have their expiration dates modified to future timestamps, which is critical for managing invitation lifecycles in real-world scenarios where invitees may need additional time to accept.
 *
 * The test creates a complete setup including member authentication, organization context, role assignment, and initial invitation with a near-future expiration. It then updates only the expires_at field to extend the invitation validity period.
 *
 * 1. Member joins the platform with email and password credentials.
 * 2. Organization is created to establish multi-tenancy context.
 * 3. Custom role is created for invitation assignment.
 * 4. Employee invitation is created with initial expiration set to 7 days in the future.
 * 5. Invitation is updated to extend expiration to 30 days in the future.
 * 6. Validates that expires_at was updated to the new timestamp while other fields remain unchanged.
 */
export async function test_api_employee_invitation_update_expiration_extension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role for invitation
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
      } satisfies Partial<IHrmPlatformRole.ICreate>,
    },
  );
  typia.assert(role);
  // 4. Create initial invitation with near-future expiration (7 days)
  const initialExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          role_id: role.id,
          expires_at: initialExpiresAt,
          employment_type: "full-time",
        } satisfies Partial<IHrmPlatformEmployeeInvitation.ICreate>,
      },
    );
  typia.assert(invitation);
  // 5. Update invitation to extend expiration (30 days from now)
  const extendedExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.update(
      memberConnection,
      {
        invitationId: invitation.id,
        body: {
          expires_at: extendedExpiresAt,
        } satisfies IHrmPlatformEmployeeInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  // 6. Validate expiration was extended
  TestValidator.equals(
    "expires_at updated to new timestamp",
    updatedInvitation.expires_at,
    extendedExpiresAt,
  );
  TestValidator.notEquals(
    "expiration date changed from original",
    invitation.expires_at,
    updatedInvitation.expires_at,
  );
  TestValidator.equals(
    "email remains unchanged",
    updatedInvitation.email,
    invitation.email,
  );
  TestValidator.equals(
    "role remains unchanged",
    updatedInvitation.role.id,
    invitation.role.id,
  );
  TestValidator.equals(
    "employment_type remains unchanged",
    updatedInvitation.employment_type,
    invitation.employment_type,
  );
  TestValidator.equals(
    "status remains pending",
    updatedInvitation.status,
    "pending",
  );
}
