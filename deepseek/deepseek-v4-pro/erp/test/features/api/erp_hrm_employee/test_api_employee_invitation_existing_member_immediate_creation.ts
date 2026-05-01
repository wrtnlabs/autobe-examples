import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test inviting an existing member to join the organization as a new employee.
 *
 * Validates the immediate employee creation flow when an organization owner with employee:manage permission invites an email address belonging to an existing, non-deleted member who is not yet an employee of the organization. Since the invited email matches an existing member, the system immediately creates an active employee record rather than a pending invitation.
 *
 * The test verifies that the created employee record contains the correct assigned role matching the provided erp_hrm_role_id, the matched member's profile fields (display_name, email, avatar_image), status set to 'active', and a valid created_at timestamp. Confirms that no pending invitation is created — the employee is immediately ready for time tracking and project participation.
 *
 * 1. Organization owner registers and authenticates, creating the organization.
 * 2. Owner creates a custom role for the employee assignment.
 * 3. A second member registers with a different email address.
 * 4. Owner invites the second member's email as an employee in the organization.
 * 5. Validates the employee record matches the invited member and assigned role.
 */
export async function test_api_employee_invitation_existing_member_immediate_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates the organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a custom role for the employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Second member registers with a different email
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {});
  typia.assert(secondMember);
  // 4. Owner invites the second member as an employee
  // Since the email matches an existing member, the employee is created immediately
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: secondMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Validate the employee record references the correct member and role
  TestValidator.equals(
    "employee role matches assigned role",
    employee.role.id,
    role.id,
  );
  TestValidator.equals(
    "employee email matches second member",
    employee.member.email,
    secondMember.email,
  );
  TestValidator.equals(
    "employee display name matches second member",
    employee.member.display_name,
    secondMember.display_name,
  );
  TestValidator.equals(
    "employee status is active (immediate creation)",
    employee.status,
    "active",
  );
  TestValidator.equals(
    "new member avatar should be null",
    employee.member.avatar_image,
    null,
  );
}
