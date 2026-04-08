import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

/**
 * Test employee self-view retrieval regardless of permission level.
 *
 * Validates that an authenticated member can always retrieve their own employee record within an organization, even without explicit employee:view permission. This enforces the self-view access rule that allows employees to access their own profile information.
 *
 * The test follows a complete employee onboarding flow: member registration, organization setup, invitation creation, invitation acceptance, and finally self-view retrieval. This ensures the employee record exists and is properly linked to the authenticated member.
 *
 * **Note**: This test requires a pre-existing organization context since organization creation SDK is not available. The member must already belong to an organization for the invitation flow to work.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create an employee invitation for the member to join an organization (requires pre-existing organization context).
 * 3. Accept the invitation to establish the employee record linking member to organization.
 * 4. Retrieve the employee record using the authenticated member's employee ID.
 * 5. Validate the response contains complete employee details including id, email, and timestamps.
 * 6. Verify the employee ID in the response matches the authenticated member's ID.
 */
export async function test_api_employee_retrieval_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create employee invitation for the member
  // This requires the member to already have an organization context
  // In simulation mode, this will generate mock data
  const invitation: IHrmEmployeeInvitation =
    await api.functional.hrm.member.invitations.create(memberConnection, {
      body: {
        email: memberAuth.email,
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    });
  typia.assert(invitation);
  // 3. Accept the invitation to create employee record
  const acceptedInvitation: IHrmEmployeeInvitation =
    await api.functional.hrm.member.invitations.accept(memberConnection, {
      invitationId: invitation.id,
      body: {
        token: invitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    });
  typia.assert(acceptedInvitation);
  // 4. Retrieve own employee record using the authenticated member's ID
  // The employee record should be linked to the member after invitation acceptance
  const employee: IHrmEmployee =
    await api.functional.hrm.member.organizations.employees.at(
      memberConnection,
      {
        organizationId: invitation.organization.id,
        employeeId: memberAuth.id,
      },
    );
  typia.assert(employee);
  // 5. Validate employee record matches authenticated member
  TestValidator.equals(
    "employee ID matches member ID",
    employee.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "employee email matches member email",
    employee.email,
    memberAuth.email,
  );
}
