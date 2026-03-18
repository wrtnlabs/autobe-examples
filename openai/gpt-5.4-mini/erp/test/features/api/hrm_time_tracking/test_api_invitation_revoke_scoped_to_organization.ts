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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_invitation_revoke_scoped_to_organization(
  connection: api.IConnection,
): Promise<void> {
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(targetMember);
  const targetOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      targetMemberConnection,
      {
        body: {
          name: `target-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(targetOrganization);
  const targetInvitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      targetMemberConnection,
      {
        body: {
          email: invitedEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(targetInvitation);
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(otherMember);
  const otherOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      otherMemberConnection,
      {
        body: {
          name: `other-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(otherOrganization);
  const otherInvitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      otherMemberConnection,
      {
        body: {
          email: invitedEmail,
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(otherInvitation);
  TestValidator.equals(
    "target invitation belongs to target organization",
    targetInvitation.organization.id,
    targetOrganization.id,
  );
  TestValidator.equals(
    "other invitation belongs to other organization",
    otherInvitation.organization.id,
    otherOrganization.id,
  );
  TestValidator.equals(
    "target invitation email",
    targetInvitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "other invitation email",
    otherInvitation.email,
    invitedEmail,
  );
  TestValidator.predicate(
    "target invitation initially pending",
    targetInvitation.status === "pending" &&
      targetInvitation.revokedAt === null,
  );
  TestValidator.predicate(
    "other invitation initially pending",
    otherInvitation.status === "pending" && otherInvitation.revokedAt === null,
  );
  const revoked =
    await api.functional.hrmTimeTracking.member.invitations.revoke(
      targetMemberConnection,
      {
        invitationId: targetInvitation.id,
      },
    );
  typia.assert(revoked);
  TestValidator.equals(
    "revoked invitation id",
    revoked.id,
    targetInvitation.id,
  );
  TestValidator.equals(
    "revoked invitation organization",
    revoked.organization.id,
    targetOrganization.id,
  );
  TestValidator.equals("revoked invitation email", revoked.email, invitedEmail);
  TestValidator.predicate(
    "revoked invitation marked revoked",
    revoked.status === "revoked" && revoked.revokedAt !== null,
  );
  TestValidator.equals(
    "other invitation organization unchanged",
    otherInvitation.organization.id,
    otherOrganization.id,
  );
  TestValidator.equals(
    "other invitation email unchanged",
    otherInvitation.email,
    invitedEmail,
  );
  TestValidator.predicate(
    "other invitation remains pending and usable",
    otherInvitation.status === "pending" && otherInvitation.revokedAt === null,
  );
}
