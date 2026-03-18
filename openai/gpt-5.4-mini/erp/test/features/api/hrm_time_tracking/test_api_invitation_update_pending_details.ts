import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";

export async function test_api_invitation_update_pending_details(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const authenticatedConnection: api.IConnection = memberConnection;
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      authenticatedConnection,
      {
        body: {
          email: invitedEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedExpiresAt = RandomGenerator.date(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
    7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const originalToken = invitation.token;
  const originalOrganizationId = invitation.organization.id;
  const originalCreatedAt = invitation.createdAt;
  const originalAcceptedAt = invitation.acceptedAt;
  const originalRevokedAt = invitation.revokedAt;
  const originalUserAccount = invitation.userAccount;
  const updated =
    await api.functional.hrmTimeTracking.member.invitations.update(
      authenticatedConnection,
      {
        invitationId: invitation.id,
        body: {
          email: updatedEmail,
          expiresAt: updatedExpiresAt,
        } satisfies IHrmTimeTrackingInvitation.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "invitation id should remain unchanged",
    updated.id,
    invitation.id,
  );
  TestValidator.equals(
    "invitation organization should remain unchanged",
    updated.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "invitation token should remain server-controlled",
    updated.token,
    originalToken,
  );
  TestValidator.equals(
    "invitation email should be updated",
    updated.email,
    updatedEmail,
  );
  TestValidator.equals(
    "invitation expiration should be updated",
    updated.expiresAt,
    updatedExpiresAt,
  );
  TestValidator.equals(
    "invitation createdAt should remain unchanged",
    updated.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "invitation acceptedAt should remain unchanged",
    updated.acceptedAt,
    originalAcceptedAt,
  );
  TestValidator.equals(
    "invitation revokedAt should remain unchanged",
    updated.revokedAt,
    originalRevokedAt,
  );
  TestValidator.equals(
    "invitation user account should remain unchanged",
    updated.userAccount,
    originalUserAccount,
  );
  TestValidator.predicate(
    "invitation should stay pending after detail update",
    updated.status === invitation.status,
  );
  TestValidator.predicate(
    "updated invitation should remain within the same organization context",
    updated.organization.id === originalOrganizationId,
  );
}
