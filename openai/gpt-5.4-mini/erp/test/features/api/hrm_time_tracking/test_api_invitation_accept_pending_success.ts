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

export async function test_api_invitation_accept_pending_success(
  connection: api.IConnection,
): Promise<void> {
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitedPassword = RandomGenerator.alphaNumeric(16);
  const invitedConnection: api.IConnection = { host: connection.host };
  const invitedMember = await authorize_member_join(invitedConnection, {
    body: {
      email: invitedEmail,
      password: invitedPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(invitedMember);
  const inviterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(inviterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const createdInvitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      inviterConnection,
      {
        body: {
          email: invitedEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(createdInvitation);
  const acceptedInvitation =
    await api.functional.hrmTimeTracking.member.invitations.accept(
      invitedConnection,
      {
        token: createdInvitation.token as string & tags.Format<"uuid">,
      },
    );
  typia.assert(acceptedInvitation);
  TestValidator.equals(
    "accepted invitation id",
    acceptedInvitation.id,
    createdInvitation.id,
  );
  TestValidator.equals(
    "accepted invitation token",
    acceptedInvitation.token,
    createdInvitation.token,
  );
  TestValidator.equals(
    "accepted invitation email",
    acceptedInvitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "accepted invitation organization",
    acceptedInvitation.organization,
    createdInvitation.organization,
  );
  TestValidator.predicate(
    "invitation accepted at set",
    acceptedInvitation.acceptedAt !== null,
  );
  TestValidator.predicate(
    "invitation is no longer pending",
    acceptedInvitation.status !== "pending",
  );
  TestValidator.equals(
    "invitation user account preserved",
    acceptedInvitation.userAccount,
    createdInvitation.userAccount,
  );
  TestValidator.equals(
    "invitation inviter preserved",
    acceptedInvitation.invitedByMember,
    createdInvitation.invitedByMember,
  );
  await TestValidator.error("cannot accept invitation twice", async () => {
    await api.functional.hrmTimeTracking.member.invitations.accept(
      invitedConnection,
      {
        token: createdInvitation.token as string & tags.Format<"uuid">,
      },
    );
  });
}
