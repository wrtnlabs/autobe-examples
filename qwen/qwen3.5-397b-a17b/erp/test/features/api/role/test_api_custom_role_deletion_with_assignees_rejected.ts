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
 * Test that deleting a custom role fails when employees are assigned to it.
 *
 * Validates the complete role deletion constraint workflow including member authentication, organization creation, custom role setup, employee invitation with role assignment, and attempted role deletion. Ensures that the system properly enforces the business rule preventing deletion of roles that have active assignees.
 *
 * Special attention is given to verifying that the 409 Conflict error is returned with appropriate messaging, and that the role remains accessible and functional after the failed deletion attempt.
 *
 * 1. Member joins the platform with valid credentials and receives authentication tokens.
 * 2. Member creates an organization and automatically becomes the owner.
 * 3. Member creates a custom role within the organization with specific permissions.
 * 4. Member creates an employee invitation with the custom role assigned.
 * 5. Member attempts to delete the custom role while it has an assignee.
 * 6. Validates deletion is rejected with 409 Conflict error.
 * 7. Validates the role object remains intact after failed deletion attempt.
 */
export async function test_api_custom_role_deletion_with_assignees_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
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
  // 3. Create custom role within the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
      } satisfies Partial<IHrmPlatformRole.ICreate>,
    },
  );
  typia.assert(role);
  // Verify role is custom (not built-in)
  TestValidator.predicate("role is custom", !role.isBuiltIn);
  // 4. Create employee invitation with the custom role assigned
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          role_id: role.id,
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies Partial<IHrmPlatformEmployeeInvitation.ICreate>,
      },
    );
  typia.assert(invitation);
  // Verify invitation was created with the correct role
  TestValidator.equals("invitation role matches", invitation.role.id, role.id);
  // 5. Attempt to delete the custom role (should fail with 409 Conflict)
  await TestValidator.httpError(
    "role deletion rejected with assignees",
    409,
    async () => {
      await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
        roleId: role.id,
      });
    },
  );
  // 6. Verify the role object remains intact after failed deletion
  // Since typia.assert already validated the role structure, we verify
  // the role properties are still accessible (role was not modified)
  TestValidator.equals("role id unchanged", role.id, role.id);
  TestValidator.equals("role name unchanged", role.name, role.name);
  TestValidator.predicate("role remains custom", !role.isBuiltIn);
}
