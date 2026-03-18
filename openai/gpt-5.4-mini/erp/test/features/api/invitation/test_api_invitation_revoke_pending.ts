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

export async function test_api_invitation_revoke_pending(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const created =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "invitation email preserved",
    created.email,
    invitationEmail,
  );
  TestValidator.equals(
    "invitation initially pending",
    created.status,
    "pending",
  );
  const revoked =
    await api.functional.hrmTimeTracking.member.invitations.revoke(
      memberConnection,
      {
        invitationId: created.id,
      },
    );
  typia.assert(revoked);
  TestValidator.equals("same invitation id", revoked.id, created.id);
  TestValidator.equals("same invitation email", revoked.email, created.email);
  TestValidator.equals("same invitation token", revoked.token, created.token);
  TestValidator.equals(
    "same organization",
    revoked.organization.id,
    created.organization.id,
  );
  TestValidator.equals("revoked status", revoked.status, "revoked");
  TestValidator.predicate(
    "revokedAt exists after revocation",
    revoked.revokedAt !== null,
  );
  TestValidator.equals(
    "acceptedAt preserved",
    revoked.acceptedAt,
    created.acceptedAt,
  );
  TestValidator.equals(
    "createdAt preserved",
    revoked.createdAt,
    created.createdAt,
  );
  TestValidator.equals(
    "updatedAt changed or preserved by server policy",
    typeof revoked.updatedAt === "string",
    true,
  );
}
