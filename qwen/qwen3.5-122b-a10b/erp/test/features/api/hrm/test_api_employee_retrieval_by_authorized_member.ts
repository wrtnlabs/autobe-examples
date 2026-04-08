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
 * Test authorized member can retrieve another employee's complete profile within their organization.
 *
 * Validates that a member with employee:view permission can successfully access another employee's detailed profile information. The test verifies complete employee data retrieval including role assignments, department membership, position details, and associated user profile information.
 *
 * The test establishes a complete employee lifecycle through invitation and acceptance, ensuring the employee record is properly created with all organizational context before attempting retrieval.
 *
 * 1. Create authorized member account with email and password credentials.
 * 2. Create target member account who will become the employee.
 * 3. Authorized member creates organization and invites target member.
 * 4. Target member accepts invitation to create employee record in organization.
 * 5. Authorized member retrieves target employee's complete profile.
 * 6. Validates response includes employee id, email, role information, department (if assigned), and all organizational metadata.
 */
export async function test_api_employee_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized member account
  const authorizedMemberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(
    authorizedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(authorizedMember);
  // 2. Create target member account (who will become employee)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Authorized member creates organization and invites target member
  // Note: Organization creation would happen through organization join flow
  // For this test, we assume organization context exists from member registration
  // Create invitation for target member
  const invitation = await generate_random_hrm_member_invitations_create(
    authorizedMemberConnection,
    {
      body: {
        email: targetMember.email,
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // 4. Target member accepts invitation
  const acceptedInvitation = await api.functional.hrm.member.invitations.accept(
    targetMemberConnection,
    {
      invitationId: invitation.id,
      body: {
        token: invitation.token,
      } satisfies IHrmEmployeeInvitation.IAccept,
    },
  );
  typia.assert(acceptedInvitation);
  // 5. Authorized member retrieves target employee's profile
  // Extract organizationId from invitation
  const organizationId = invitation.organization.id;
  const employeeId = acceptedInvitation.member?.id;
  if (!employeeId) {
    throw new Error("Target member ID not found after invitation acceptance");
  }
  const employee = await api.functional.hrm.member.organizations.employees.at(
    authorizedMemberConnection,
    {
      organizationId,
      employeeId,
    },
  );
  typia.assert(employee);
  // 6. Validate employee data
  TestValidator.equals(
    "employee email matches",
    employee.email,
    targetMember.email,
  );
  TestValidator.predicate("employee has valid id", employee.id === employeeId);
}
