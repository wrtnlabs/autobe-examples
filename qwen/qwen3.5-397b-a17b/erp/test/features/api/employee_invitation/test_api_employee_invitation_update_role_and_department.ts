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
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test updating a pending employee invitation's role and department assignment.
 *
 * Validates the complete invitation update workflow including organization setup, role creation, department assignment, and invitation modification. Ensures that pending invitations can be updated with new role assignments, department changes, position updates, and extended expiration dates before acceptance.
 *
 * The test verifies that all modifiable fields (role_id, department_id, position, employment_type, expires_at) are correctly updated and that the response includes the updated related entity data with correct role and department names. The updated_at timestamp must reflect the modification time.
 *
 * 1. Member registers and authenticates to access organization-scoped operations.
 * 2. Organization is created as the container for all subsequent resources.
 * 3. Two roles are created: initial role for invitation and target role for update.
 * 4. Two departments are created: initial department and target department for update.
 * 5. Initial pending invitation is created with initial role and department.
 * 6. Invitation is updated with target role, target department, new position, and extended expiration.
 * 7. Validates all updated fields match the update request and related entity data is correct.
 */
export async function test_api_employee_invitation_update_role_and_department(
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
  // 2. Organization creation
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create two roles: initial and target
  const initialRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(initialRole);
  const targetRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        organization_id: organization.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(targetRole);
  // 4. Create two departments: initial and target
  const initialDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(initialDepartment);
  const targetDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(targetDepartment);
  // 5. Create initial pending invitation
  const initialExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const initialInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: initialRole.id,
          department_id: initialDepartment.id,
          position: "Initial Position",
          employment_type: "full-time",
          expires_at: initialExpiresAt,
        },
      },
    );
  typia.assert(initialInvitation);
  // Verify initial state
  TestValidator.equals(
    "initial role matches",
    initialInvitation.role.id,
    initialRole.id,
  );
  TestValidator.equals(
    "initial department matches",
    initialInvitation.department?.id,
    initialDepartment.id,
  );
  TestValidator.equals(
    "initial position",
    initialInvitation.position,
    "Initial Position",
  );
  TestValidator.equals(
    "initial employment type",
    initialInvitation.employment_type,
    "full-time",
  );
  // 6. Update invitation with new role, department, position, and extended expiration
  const newExpiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newPosition = "Senior " + RandomGenerator.name(1);
  const updatedInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.update(
      memberConnection,
      {
        invitationId: initialInvitation.id,
        body: {
          role_id: targetRole.id,
          department_id: targetDepartment.id,
          position: newPosition,
          employment_type: "part-time",
          expires_at: newExpiresAt,
        } satisfies IHrmPlatformEmployeeInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  // 7. Validate all updated fields
  TestValidator.equals(
    "role updated",
    updatedInvitation.role.id,
    targetRole.id,
  );
  TestValidator.equals(
    "role name matches target",
    updatedInvitation.role.name,
    targetRole.name,
  );
  TestValidator.equals(
    "department updated",
    updatedInvitation.department?.id,
    targetDepartment.id,
  );
  TestValidator.equals(
    "department name matches",
    updatedInvitation.department?.name,
    targetDepartment.name,
  );
  TestValidator.equals(
    "position updated",
    updatedInvitation.position,
    newPosition,
  );
  TestValidator.equals(
    "employment type updated",
    updatedInvitation.employment_type,
    "part-time",
  );
  TestValidator.equals(
    "expires_at extended",
    updatedInvitation.expires_at,
    newExpiresAt,
  );
  // Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedInvitation.updated_at,
    initialInvitation.updated_at,
  );
  // Validate invitation remains pending
  TestValidator.equals(
    "status remains pending",
    updatedInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "accepted_at still null",
    updatedInvitation.accepted_at,
    null,
  );
}
