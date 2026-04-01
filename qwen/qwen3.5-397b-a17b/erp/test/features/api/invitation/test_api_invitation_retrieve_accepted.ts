import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test retrieving an accepted employee invitation where the invited user has signed up.
 *
 * Workflow:
 * 1. Create inviter member account and authenticate
 * 2. Create organization for the inviter
 * 3. Create pending invitation for a specific email address
 * 4. Register the invited email as a new member (triggers automatic acceptance)
 * 5. Retrieve the invitation using the inviter's connection
 * 6. Validate the invitation shows accepted status with all required fields
 */
export async function test_api_invitation_retrieve_accepted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create inviter member account
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviterEmail = typia.random<string & tags.Format<"email">>();
  const inviter = await authorize_member_join(inviterConnection, {
    body: {
      email: inviterEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(inviter);
  // 2. Create organization for the inviter
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      inviterConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create pending invitation for a specific email
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      inviterConnection,
      {
        body: {
          email: invitedEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: expiresAt,
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Register the invited email as a new member (triggers automatic acceptance)
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_member_join(inviteeConnection, {
    body: {
      email: invitedEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(invitee);
  // 5. Retrieve the invitation using the inviter's connection
  const retrievedInvitation =
    await api.functional.hrmPlatform.member.invitations.at(inviterConnection, {
      invitationId: invitation.id,
    });
  typia.assert(retrievedInvitation);
  // 6. Validate the accepted invitation
  TestValidator.equals(
    "invitation status is accepted",
    retrievedInvitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "accepted_at is populated",
    retrievedInvitation.accepted_at !== null,
  );
  // Validate user field contains invited member's summary information
  TestValidator.predicate(
    "user field is populated",
    retrievedInvitation.user !== null,
  );
  if (retrievedInvitation.user !== null) {
    TestValidator.equals(
      "user id matches invitee",
      retrievedInvitation.user.id,
      invitee.id,
    );
    TestValidator.equals(
      "user display_name matches",
      retrievedInvitation.user.display_name,
      invitee.display_name,
    );
    TestValidator.equals(
      "user avatar_image matches",
      retrievedInvitation.user.avatar_image,
      invitee.avatar_image,
    );
    TestValidator.equals(
      "user phone_number matches",
      retrievedInvitation.user.phone_number,
      invitee.phone_number,
    );
  }
  // Validate organization details
  TestValidator.equals(
    "organization id matches",
    retrievedInvitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedInvitation.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization currency matches",
    retrievedInvitation.organization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrievedInvitation.organization.timezone,
    organization.timezone,
  );
  // Validate invitedBy details
  TestValidator.equals(
    "invitedBy id matches inviter",
    retrievedInvitation.invitedBy.id,
    inviter.id,
  );
  TestValidator.equals(
    "invitedBy display_name matches",
    retrievedInvitation.invitedBy.display_name,
    inviter.display_name,
  );
  TestValidator.equals(
    "invitation email matches invited email",
    retrievedInvitation.email,
    invitedEmail,
  );
}
