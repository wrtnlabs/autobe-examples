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

export async function test_api_invitation_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization for the member
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create pending invitation for non-existing user email
  const inviteEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: inviteEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Retrieve the invitation by ID
  const retrievedInvitation =
    await api.functional.hrmPlatform.member.invitations.at(memberConnection, {
      invitationId: invitation.id,
    });
  typia.assert(retrievedInvitation);
  // 5. Validate invitation details
  TestValidator.equals(
    "invitation ID matches",
    retrievedInvitation.id,
    invitation.id,
  );
  TestValidator.equals(
    "invited email matches",
    retrievedInvitation.email,
    inviteEmail,
  );
  TestValidator.equals(
    "status is pending",
    retrievedInvitation.status,
    "pending",
  );
  TestValidator.predicate(
    "invited_at is present",
    retrievedInvitation.invited_at !== null,
  );
  TestValidator.predicate(
    "expires_at is present",
    retrievedInvitation.expires_at !== null,
  );
  TestValidator.equals(
    "accepted_at is null",
    retrievedInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "user is null (not signed up)",
    retrievedInvitation.user,
    null,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedInvitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedInvitation.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "invitedBy member ID matches",
    retrievedInvitation.invitedBy.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "invitedBy display name matches",
    retrievedInvitation.invitedBy.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "invited_at is valid date-time",
    !isNaN(Date.parse(retrievedInvitation.invited_at)),
  );
  TestValidator.predicate(
    "expires_at is valid date-time",
    !isNaN(Date.parse(retrievedInvitation.expires_at)),
  );
  TestValidator.predicate(
    "expires_at is in the future",
    new Date(retrievedInvitation.expires_at).getTime() > Date.now(),
  );
}
