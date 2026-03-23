import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test that an authenticated admin can retrieve detailed information about an accepted employee invitation that shows the member who redeemed it.
 *
 * This test validates the complete employee invitation acceptance workflow:
 * 1. Admin creates an employee invitation with a specific email and role
 * 2. A member account is created with the invited email (simulating invitation acceptance)
 * 3. Admin retrieves the invitation details and verifies it shows the accepted status
 * 4. Validates that redeemedByMember contains the member who accepted the invitation
 * 5. Confirms all invitation fields are properly populated including timestamps
 */
export async function test_api_employee_invitation_retrieve_accepted_with_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
    },
  });
  // 2. Create employee invitation with a unique email
  const inviteEmail = typia.random<string & tags.Format<"email">>();
  const invitation: IHrmPlatformEmployeeInvitation =
    await generate_random_hrm_platform_admin_invitations_create(
      adminConnection,
      {
        body: {
          email: inviteEmail,
        },
      },
    );
  typia.assert(invitation);
  // 3. Simulate invitation acceptance by creating member account with the invited email
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: inviteEmail,
        password: "password123",
      },
    });
  typia.assert(memberAuth);
  // 4. Retrieve the invitation details as admin
  const retrievedInvitation: IHrmPlatformEmployeeInvitation =
    await api.functional.hrmPlatform.admin.invitations.at(adminConnection, {
      invitationId: invitation.id,
    });
  typia.assert(retrievedInvitation);
  // 5. Validate invitation status is 'accepted'
  TestValidator.equals(
    "invitation status is accepted",
    retrievedInvitation.status,
    "accepted",
  );
  // 6. Validate redeemed_at is not null (invitation was accepted)
  TestValidator.predicate(
    "redeemed_at has timestamp",
    retrievedInvitation.redeemed_at !== null,
  );
  // 7. Validate redeemedByMember exists and matches the member who accepted
  TestValidator.predicate(
    "redeemedByMember exists",
    retrievedInvitation.redeemedByMember !== null,
  );
  typia.assertGuard(retrievedInvitation.redeemedByMember!);
  TestValidator.equals(
    "redeemedByMember email matches",
    retrievedInvitation.redeemedByMember.email,
    inviteEmail,
  );
  TestValidator.equals(
    "redeemedByMember id matches",
    retrievedInvitation.redeemedByMember.id,
    memberAuth.id,
  );
  // 8. Validate invitation email matches
  TestValidator.equals(
    "invitation email matches",
    retrievedInvitation.email,
    inviteEmail,
  );
  // 9. Validate organization and role details exist (non-nullable, validated by typia.assert)
  TestValidator.predicate(
    "organization has name",
    retrievedInvitation.organization.name.length > 0,
  );
  TestValidator.predicate(
    "role has name",
    retrievedInvitation.role.name.length > 0,
  );
  // 10. Validate timestamps are present (non-nullable, validated by typia.assert)
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedInvitation.created_at).toISOString() ===
      retrievedInvitation.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedInvitation.updated_at).toISOString() ===
      retrievedInvitation.updated_at,
  );
  TestValidator.predicate(
    "expires_at is valid date",
    new Date(retrievedInvitation.expires_at).toISOString() ===
      retrievedInvitation.expires_at,
  );
}
