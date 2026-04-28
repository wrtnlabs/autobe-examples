import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Verify that a custom role with active employee assignments cannot be deleted.
 *
 * Tests the role deletion protection mechanism that prevents removal of roles
 * currently assigned to active employees, preserving operational continuity.
 * A custom role is created and assigned to a newly invited employee to establish
 * the dependency relationship.
 *
 * When deletion is attempted on the assigned role, the system returns a 409 Conflict
 * error, confirming that the role cannot be removed while it has active assignments.
 *
 * 1. Member authenticates via join and creates the organization context.
 * 2. A second member account is created for employee assignment.
 * 3. A custom role is created within the organization.
 * 4. An employee record is created, linking the second member to the custom role.
 * 5. Role deletion is attempted and expected to fail with 409 Conflict.
 */
export async function test_api_role_custom_deletion_fails_with_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (org owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a second member account for employee assignment
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 3. Create a custom role
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(customRole);
  // 4. Create an employee assigned to the custom role
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: secondMember.id,
        roleId: customRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Attempt to delete the role - should fail with 409 Conflict
  await TestValidator.httpError(
    "role deletion fails with 409 Conflict when assigned to active employee",
    409,
    async () =>
      await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
        roleId: customRole.id,
      }),
  );
}
