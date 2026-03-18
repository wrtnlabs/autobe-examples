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

export async function test_api_organization_invitation_detail_resolved_after_matching_signup(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
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
          name: `invite-role-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view", "project:view"],
            },
          ],
        },
      },
    );
  typia.assert(role);
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitationMessage = RandomGenerator.paragraph({ sentences: 2 });
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: invitedEmail,
          hrm_time_tracking_role_id: role.id,
          message: invitationMessage,
        },
      },
    );
  typia.assert(invitation);
  const firstDetail =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(firstDetail);
  const secondDetail =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(secondDetail);
  TestValidator.equals(
    "invitation detail id matches created invitation",
    firstDetail.id,
    invitation.id,
  );
  TestValidator.equals(
    "detail preserves invited email",
    firstDetail.email,
    invitedEmail,
  );
  TestValidator.equals(
    "detail preserves invitation message",
    firstDetail.message,
    invitationMessage,
  );
  TestValidator.equals(
    "detail preserves organization id",
    firstDetail.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "detail preserves organization name",
    firstDetail.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "detail preserves assigned role id",
    firstDetail.role?.id ?? null,
    role.id,
  );
  TestValidator.equals(
    "detail preserves assigned role name",
    firstDetail.role?.name ?? null,
    role.name,
  );
  TestValidator.equals(
    "detail email remains stable across repeated reads",
    secondDetail.email,
    firstDetail.email,
  );
  TestValidator.equals(
    "detail message remains stable across repeated reads",
    secondDetail.message,
    firstDetail.message,
  );
  TestValidator.equals(
    "detail invited_at remains stable across repeated reads",
    secondDetail.invited_at,
    firstDetail.invited_at,
  );
  TestValidator.equals(
    "detail created_at remains stable across repeated reads",
    secondDetail.created_at,
    firstDetail.created_at,
  );
  TestValidator.equals(
    "detail updated_at remains stable across repeated reads",
    secondDetail.updated_at,
    firstDetail.updated_at,
  );
  TestValidator.equals(
    "detail organization id remains stable across repeated reads",
    secondDetail.organization.id,
    firstDetail.organization.id,
  );
  TestValidator.equals(
    "detail organization name remains stable across repeated reads",
    secondDetail.organization.name,
    firstDetail.organization.name,
  );
  TestValidator.equals(
    "detail role id remains stable across repeated reads",
    secondDetail.role?.id ?? null,
    firstDetail.role?.id ?? null,
  );
  TestValidator.equals(
    "detail role name remains stable across repeated reads",
    secondDetail.role?.name ?? null,
    firstDetail.role?.name ?? null,
  );
  TestValidator.equals(
    "detail status remains stable across repeated reads",
    secondDetail.status,
    firstDetail.status,
  );
  TestValidator.equals(
    "detail accepted_at remains stable across repeated reads",
    secondDetail.accepted_at,
    firstDetail.accepted_at,
  );
  TestValidator.equals(
    "detail resolved_at remains stable across repeated reads",
    secondDetail.resolved_at,
    firstDetail.resolved_at,
  );
  TestValidator.equals(
    "detail expired_at remains stable across repeated reads",
    secondDetail.expired_at,
    firstDetail.expired_at,
  );
  TestValidator.equals(
    "detail cancelled_at remains stable across repeated reads",
    secondDetail.cancelled_at,
    firstDetail.cancelled_at,
  );
  TestValidator.predicate(
    "created invitation is unresolved without signup match",
    firstDetail.resolved_at === null,
  );
  TestValidator.predicate(
    "created invitation is unaccepted without signup match",
    firstDetail.accepted_at === null,
  );
}
