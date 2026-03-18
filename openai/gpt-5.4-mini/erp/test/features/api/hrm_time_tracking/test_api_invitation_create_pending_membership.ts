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

export async function test_api_invitation_create_pending_membership(
  connection: api.IConnection,
): Promise<void> {
  const inviterConnection: api.IConnection = { host: connection.host };
  const inviterEmail = typia.random<string & tags.Format<"email">>();
  const inviterPassword = RandomGenerator.alphaNumeric(16);
  const inviter = await authorize_member_join(inviterConnection, {
    body: {
      email: inviterEmail,
      password: inviterPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(inviter);
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      inviterConnection,
      {
        body: {
          email: invitationEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation email should match request",
    invitation.email,
    invitationEmail,
  );
  TestValidator.equals(
    "invitation should be pending for a new email",
    invitation.status,
    "pending",
  );
  TestValidator.predicate(
    "invitation should belong to an organization",
    invitation.organization.id.length > 0,
  );
  TestValidator.predicate(
    "invitation should not yet be accepted",
    invitation.acceptedAt === null,
  );
  TestValidator.predicate(
    "invitation should not be revoked",
    invitation.revokedAt === null,
  );
  TestValidator.predicate(
    "invitation should be scoped to the active organization",
    invitation.organization.name.length > 0,
  );
  const sameEmailJoinConnection: api.IConnection = { host: connection.host };
  const joinedAccount = await authorize_member_join(sameEmailJoinConnection, {
    body: {
      email: invitationEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinedAccount);
  TestValidator.equals(
    "later sign-up should use the same email",
    joinedAccount.email,
    invitationEmail,
  );
}
