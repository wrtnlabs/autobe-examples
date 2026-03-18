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

export async function test_api_invitation_create_existing_account_fulfillment(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const invitationEmail = joined.email;
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      actorConnection,
      {
        body: {
          email: invitationEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  TestValidator.equals(
    "invitation email matches requested existing account email",
    invitation.email,
    invitationEmail,
  );
  TestValidator.predicate(
    "invitation has organization linkage",
    invitation.organization.id.length > 0,
  );
  TestValidator.predicate(
    "invitation organization name is present",
    invitation.organization.name.length > 0,
  );
  TestValidator.predicate(
    "invitation status is populated",
    invitation.status.length > 0,
  );
  TestValidator.predicate(
    "invitation token is populated",
    invitation.token.length > 0,
  );
  TestValidator.predicate(
    "invitation expiry is present",
    invitation.expiresAt.length > 0,
  );
  TestValidator.equals(
    "invitation is not soft deleted",
    invitation.deletedAt,
    null,
  );
  TestValidator.equals(
    "invitation is not accepted yet",
    invitation.acceptedAt,
    null,
  );
  TestValidator.equals(
    "invitation is not revoked yet",
    invitation.revokedAt,
    null,
  );
  TestValidator.equals(
    "invitation inviter summary is absent for this test flow",
    invitation.invitedByMember,
    null,
  );
}
