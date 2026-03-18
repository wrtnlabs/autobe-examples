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

export async function test_api_invitation_update_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(authorized);
  const invitationOwnerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const firstInvitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      invitationOwnerConnection,
      {
        body: {
          email: firstEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(firstInvitation);
  const secondInvitation =
    await api.functional.hrmTimeTracking.member.invitations.create(
      invitationOwnerConnection,
      {
        body: {
          email: secondEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(secondInvitation);
  await TestValidator.error(
    "duplicate invitation email update should conflict",
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.update(
        invitationOwnerConnection,
        {
          invitationId: secondInvitation.id,
          body: {
            email: firstInvitation.email,
          } satisfies IHrmTimeTrackingInvitation.IUpdate,
        },
      );
    },
  );
}
