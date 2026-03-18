import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_owner_organizations_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_invitations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_organization_invitation";

export async function test_api_organization_invitation_update_cancelled_stops_pending_onboarding(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StablePass1234!",
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const pendingInvitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: invitedEmail,
          message: RandomGenerator.paragraph({ sentences: 3 }),
          hrm_time_tracking_role_id: null,
        },
      },
    );
  typia.assert(pendingInvitation);
  TestValidator.equals(
    "initial invitation organization is preserved",
    pendingInvitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "initial invitation email matches input",
    pendingInvitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "initial invitation starts pending",
    pendingInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "initial invitation not accepted yet",
    pendingInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "initial invitation not resolved yet",
    pendingInvitation.resolved_at,
    null,
  );
  TestValidator.equals(
    "initial invitation not expired yet",
    pendingInvitation.expired_at,
    null,
  );
  TestValidator.equals(
    "initial invitation not cancelled yet",
    pendingInvitation.cancelled_at,
    null,
  );
  const cancelledAt = new Date(Date.now() + 60000).toISOString();
  const updateBody = {
    status: "cancelled",
    cancelled_at: cancelledAt,
    accepted_at: null,
    resolved_at: null,
    expired_at: null,
    message: pendingInvitation.message,
    hrm_time_tracking_role_id:
      pendingInvitation.role !== null ? pendingInvitation.role.id : null,
  } satisfies IHrmTimeTrackingOrganizationInvitation.IUpdate;
  const updatedInvitation =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: pendingInvitation.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInvitation);
  TestValidator.equals(
    "updated invitation keeps same id",
    updatedInvitation.id,
    pendingInvitation.id,
  );
  TestValidator.equals(
    "updated invitation keeps same organization",
    updatedInvitation.organization.id,
    pendingInvitation.organization.id,
  );
  TestValidator.equals(
    "updated invitation keeps same organization name",
    updatedInvitation.organization.name,
    pendingInvitation.organization.name,
  );
  TestValidator.equals(
    "updated invitation keeps same email",
    updatedInvitation.email,
    pendingInvitation.email,
  );
  TestValidator.equals(
    "updated invitation status becomes cancelled",
    updatedInvitation.status,
    "cancelled",
  );
  TestValidator.equals(
    "cancelled timestamp populated as requested",
    updatedInvitation.cancelled_at,
    cancelledAt,
  );
  TestValidator.equals(
    "accepted timestamp remains null after cancellation",
    updatedInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "resolved timestamp remains null after cancellation",
    updatedInvitation.resolved_at,
    null,
  );
  TestValidator.equals(
    "expired timestamp remains null after cancellation",
    updatedInvitation.expired_at,
    null,
  );
  TestValidator.equals(
    "cancellation does not soft delete the invitation",
    updatedInvitation.deleted_at,
    pendingInvitation.deleted_at,
  );
  TestValidator.equals(
    "administrative cancellation does not alter invited-at timestamp",
    updatedInvitation.invited_at,
    pendingInvitation.invited_at,
  );
  TestValidator.predicate(
    "updated_at advances after administrative cancellation",
    new Date(updatedInvitation.updated_at).getTime() >
      new Date(pendingInvitation.updated_at).getTime(),
  );
}
