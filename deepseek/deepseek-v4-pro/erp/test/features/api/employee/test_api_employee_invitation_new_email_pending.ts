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
 * Test employee invitation with a new email that does not match any existing member account.
 *
 * Validates the pending invitation flow where the invited email address corresponds to no existing user. Since the email is unknown to the system, a pending invitation record is created rather than an immediate employee record. The invitation will be automatically resolved when the invitee later signs up with the matching email address.
 *
 * 1. Organization Owner signs up via authorize_member_join, creating a member account with a new organization.
 * 2. Owner creates a custom role to assign to the invited employee.
 * 3. Owner invites an employee using a randomly generated email that does not match any existing member.
 * 4. Validates that the pending invitation preserves the assigned role, position, and employment type.
 */
export async function test_api_employee_invitation_new_email_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Sign up and authenticate as the organization Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a custom role to assign to the invited employee
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Invite employee with email that does not match any existing member
  const inviteEmail = typia.random<string & tags.Format<"email">>();
  const invitePosition = RandomGenerator.paragraph({ sentences: 2 });
  const inviteEmploymentType = "contractor" as const;
  const invitation = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: inviteEmail,
        erp_hrm_role_id: role.id,
        position: invitePosition,
        employment_type: inviteEmploymentType,
      },
    },
  );
  typia.assert(invitation);
  // 4. Validate the pending invitation preserves all provided details
  TestValidator.equals("role id matches", invitation.role.id, role.id);
  TestValidator.equals(
    "position preserved",
    invitation.position,
    invitePosition,
  );
  TestValidator.equals(
    "employment type preserved",
    invitation.employment_type,
    inviteEmploymentType,
  );
  TestValidator.predicate("invitation has valid id", invitation.id.length > 0);
}
