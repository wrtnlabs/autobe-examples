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

export async function test_api_invitation_get_detail_by_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const created =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IHrmTimeTrackingInvitation.ICreate,
      },
    );
  typia.assert(created);
  const snapshot = {
    status: created.status,
    acceptedAt: created.acceptedAt,
    revokedAt: created.revokedAt,
    updatedAt: created.updatedAt,
    deletedAt: created.deletedAt,
  };
  const detail = await api.functional.hrmTimeTracking.member.invitations.at(
    memberConnection,
    { invitationId: created.id },
  );
  typia.assert(detail);
  TestValidator.equals("invitation id", detail.id, created.id);
  TestValidator.equals("invited email", detail.email, created.email);
  TestValidator.equals("status", detail.status, snapshot.status);
  TestValidator.equals(
    "organization",
    detail.organization,
    created.organization,
  );
  TestValidator.equals(
    "invited by member",
    detail.invitedByMember,
    created.invitedByMember,
  );
  TestValidator.equals("user account", detail.userAccount, created.userAccount);
  TestValidator.equals("expires at", detail.expiresAt, created.expiresAt);
  TestValidator.equals("accepted at", detail.acceptedAt, snapshot.acceptedAt);
  TestValidator.equals("revoked at", detail.revokedAt, snapshot.revokedAt);
  TestValidator.equals("created at", detail.createdAt, created.createdAt);
  TestValidator.equals("updated at", detail.updatedAt, snapshot.updatedAt);
  TestValidator.equals("deleted at", detail.deletedAt, snapshot.deletedAt);
  TestValidator.predicate(
    "organization detail contains identifying fields",
    detail.organization.id.length > 0 && detail.organization.name.length > 0,
  );
}
