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

export async function test_api_organization_invitation_update_foreign_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/owners/join",
      referrer: "https://example.com/owners",
    },
  });
  typia.assert(authorized);
  const organizationA =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org-A-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/logo-a.png",
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organizationA);
  const localRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationA.id,
        },
        body: {
          name: `Role-A-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view", "project:view"],
            },
          ],
        },
      },
    );
  typia.assert(localRole);
  const originalMessage = RandomGenerator.paragraph({ sentences: 3 });
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationA.id,
        },
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          hrm_time_tracking_role_id: localRole.id,
          message: originalMessage,
        },
      },
    );
  typia.assert(invitation);
  const originalOrganizationId = invitation.organization.id;
  const originalRoleId = invitation.role?.id ?? null;
  const originalStatus = invitation.status;
  const originalInvitationMessage = invitation.message;
  const organizationB =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org-B-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: "https://example.com/logo-b.png",
          currency_code: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 4,
        },
      },
    );
  typia.assert(organizationB);
  const foreignRole =
    await generate_random_hrm_time_tracking_owner_organizations_roles_create(
      ownerConnection,
      {
        params: {
          organizationId: organizationB.id,
        },
        body: {
          name: `Role-B-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["time:view_all", "report:view"],
            },
          ],
        },
      },
    );
  typia.assert(foreignRole);
  TestValidator.equals(
    "invitation belongs to organization A",
    invitation.organization.id,
    organizationA.id,
  );
  TestValidator.equals(
    "local role belongs to organization A",
    localRole.organization.id,
    organizationA.id,
  );
  TestValidator.equals(
    "foreign role belongs to organization B",
    foreignRole.organization.id,
    organizationB.id,
  );
  TestValidator.notEquals(
    "organizations are different",
    organizationA.id,
    organizationB.id,
  );
  TestValidator.notEquals("roles are different", localRole.id, foreignRole.id);
  TestValidator.equals(
    "invitation originally references local role",
    originalRoleId,
    localRole.id,
  );
  TestValidator.equals(
    "invitation original message matches input",
    originalInvitationMessage,
    originalMessage,
  );
  await TestValidator.error(
    "reject foreign organization role when updating invitation",
    async () => {
      await api.functional.hrmTimeTracking.owner.organizations.invitations.update(
        ownerConnection,
        {
          organizationId: organizationA.id,
          invitationId: invitation.id,
          body: {
            hrm_time_tracking_role_id: foreignRole.id,
            status: originalStatus,
            message: originalInvitationMessage,
            accepted_at: invitation.accepted_at,
            resolved_at: invitation.resolved_at,
            expired_at: invitation.expired_at,
            cancelled_at: invitation.cancelled_at,
          },
        },
      );
    },
  );
  TestValidator.equals(
    "original invitation organization remains unchanged in snapshot",
    invitation.organization.id,
    originalOrganizationId,
  );
  TestValidator.equals(
    "original invitation role remains unchanged in snapshot",
    invitation.role?.id ?? null,
    originalRoleId,
  );
  TestValidator.equals(
    "original invitation status remains unchanged in snapshot",
    invitation.status,
    originalStatus,
  );
  TestValidator.equals(
    "original invitation message remains unchanged in snapshot",
    invitation.message,
    originalInvitationMessage,
  );
}
