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
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test the retrieval of an accepted employee invitation to verify status transition and accepted_at timestamp.
 *
 * Prerequisites:
 * 1. Authenticate as a member with employee:manage permission (inviter)
 * 2. Create a pending employee invitation for a unique email address
 * 3. Complete the signup flow for the invited email address to accept the invitation
 *
 * Test Steps:
 * 1. Member (inviter) joins the platform with unique credentials
 * 2. Inviter creates a pending employee invitation with role, employment_type, and future expires_at
 * 3. A second member (invitee) joins the platform using the invited email address
 * 4. Call GET /hrmPlatform/member/employee-invitations/{invitationId} with the accepted invitation's ID
 * 5. Verify the response returns complete invitation details with status='accepted'
 * 6. Validate accepted_at timestamp is set (not null) and is a valid ISO 8601 datetime
 * 7. Validate accepted_at is after invited_at timestamp
 * 8. Verify all other fields remain intact: email, employment_type, role, organization, invitedBy match original values
 *
 * Business Logic Validation:
 * 1. Accepted invitations remain accessible for audit purposes
 * 2. Status transition from 'pending' to 'accepted' is properly recorded
 * 3. accepted_at timestamp accurately reflects when the user signed up
 * 4. Invitation data is preserved after acceptance for historical reference
 */
export async function test_api_employee_invitation_retrieval_accepted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create inviter member account
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviter = await authorize_member_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviter);
  // 2. Create pending employee invitation with invited email
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = futureDate.toISOString();
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      inviterConnection,
      {
        body: {
          email: invitedEmail,
          employment_type: RandomGenerator.pick([
            "full-time",
            "part-time",
            "contractor",
            "intern",
          ] as const),
          expires_at: expiresAt,
        },
      },
    );
  typia.assert(invitation);
  // 3. Invitee joins the platform using the invited email (accepts invitation)
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_member_join(inviteeConnection, {
    body: {
      email: invitedEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(invitee);
  // 4. Retrieve the accepted invitation
  const retrievedInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.at(
      inviterConnection,
      {
        invitationId: invitation.id,
      },
    );
  typia.assert(retrievedInvitation);
  // 5. Validate status is 'accepted'
  TestValidator.equals(
    "status is accepted",
    retrievedInvitation.status,
    "accepted",
  );
  // 6. Validate accepted_at is set and is a valid timestamp
  TestValidator.predicate(
    "accepted_at is set",
    retrievedInvitation.accepted_at !== null,
  );
  TestValidator.predicate(
    "accepted_at is valid date-time",
    () => !isNaN(Date.parse(retrievedInvitation.accepted_at!)),
  );
  // 7. Validate accepted_at is after invited_at
  TestValidator.predicate(
    "accepted_at is after invited_at",
    () =>
      new Date(retrievedInvitation.accepted_at!) >
      new Date(retrievedInvitation.invited_at),
  );
  // 8. Verify all other fields remain intact
  TestValidator.equals(
    "email matches original",
    retrievedInvitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "employment_type matches",
    retrievedInvitation.employment_type,
    invitation.employment_type,
  );
  TestValidator.equals(
    "organization matches",
    retrievedInvitation.organization.id,
    invitation.organization.id,
  );
  TestValidator.equals(
    "invitedBy matches",
    retrievedInvitation.invitedBy.id,
    invitation.invitedBy.id,
  );
  TestValidator.equals(
    "role matches",
    retrievedInvitation.role.id,
    invitation.role.id,
  );
  TestValidator.equals(
    "invited_at preserved",
    retrievedInvitation.invited_at,
    invitation.invited_at,
  );
  TestValidator.equals(
    "expires_at preserved",
    retrievedInvitation.expires_at,
    invitation.expires_at,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedInvitation.deleted_at === null,
  );
}
