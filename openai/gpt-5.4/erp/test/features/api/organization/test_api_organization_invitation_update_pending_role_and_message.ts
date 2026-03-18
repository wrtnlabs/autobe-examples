import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationInvitation";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
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
import { generate_random_hrm_time_tracking_owner_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_roles_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_organization_invitation";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_role_permission } from "../../../prepare/prepare_random_hrm_time_tracking_role_permission";

export async function test_api_organization_invitation_update_pending_role_and_message(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
      ip: "127.0.0.1",
    },
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: "https://example.com/logo.png",
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number as number,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const role =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: `Role ${RandomGenerator.name(2)}`,
          permissions: [
            {
              permissions: ["employee:view", "project:view"],
            },
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(role);
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const originalMessage = RandomGenerator.paragraph({ sentences: 2 });
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: invitationEmail,
          message: originalMessage,
        } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  const updatedMessage = RandomGenerator.content({ paragraphs: 2 });
  const updated =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
        body: {
          hrm_time_tracking_role_id: role.id,
          status: "pending",
          message: updatedMessage,
          accepted_at: null,
          resolved_at: null,
          expired_at: null,
          cancelled_at: null,
        } satisfies IHrmTimeTrackingOrganizationInvitation.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("same invitation id", updated.id, invitation.id);
  TestValidator.equals(
    "same organization id",
    updated.organization.id,
    invitation.organization.id,
  );
  TestValidator.equals(
    "organization matches created organization",
    updated.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name preserved",
    updated.organization.name,
    invitation.organization.name,
  );
  TestValidator.equals("same invitee email", updated.email, invitation.email);
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    invitation.updated_at,
  );
  TestValidator.predicate(
    "updated_at is newer or equal",
    new Date(updated.updated_at).getTime() >=
      new Date(invitation.updated_at).getTime(),
  );
  TestValidator.equals("message updated", updated.message, updatedMessage);
  TestValidator.equals("status remains pending", updated.status, "pending");
  TestValidator.equals("accepted_at remains null", updated.accepted_at, null);
  TestValidator.equals("resolved_at remains null", updated.resolved_at, null);
  TestValidator.equals("expired_at remains null", updated.expired_at, null);
  TestValidator.equals("cancelled_at remains null", updated.cancelled_at, null);
  TestValidator.equals("deleted_at remains null", updated.deleted_at, null);
  TestValidator.equals(
    "invited_at unchanged",
    updated.invited_at,
    invitation.invited_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    invitation.created_at,
  );
  TestValidator.equals(
    "organization summary preserved",
    updated.organization,
    invitation.organization,
  );
  TestValidator.predicate("role assigned", updated.role !== null);
  TestValidator.equals("role id updated", updated.role!.id, role.id);
  TestValidator.equals("role name updated", updated.role!.name, role.name);
  TestValidator.equals(
    "role organization matches invitation organization",
    updated.role!.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "role organization preserved",
    updated.role!.organization.id,
    updated.organization.id,
  );
}
