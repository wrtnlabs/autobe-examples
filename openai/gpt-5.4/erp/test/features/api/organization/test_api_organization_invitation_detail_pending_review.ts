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

export async function test_api_organization_invitation_detail_pending_review(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `Org ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
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
          name: `role-${RandomGenerator.alphabets(8)}`,
          permissions: [
            {
              permissions: ["employee:view", "time:view_all"],
            } satisfies IHrmTimeTrackingRolePermission.ICreate,
          ],
        } satisfies IHrmTimeTrackingRole.ICreate,
      },
    );
  typia.assert(role);
  const invitationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    hrm_time_tracking_role_id: role.id,
    message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingOrganizationInvitation.ICreate;
  const invitation =
    await generate_random_hrm_time_tracking_owner_organizations_invitations_create(
      ownerConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: invitationBody,
      },
    );
  typia.assert(invitation);
  const detail =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("invitation id matches", detail.id, invitation.id);
  TestValidator.equals(
    "organization id matches",
    detail.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    detail.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization description matches",
    detail.organization.description,
    organization.description,
  );
  TestValidator.equals(
    "organization logo_uri matches",
    detail.organization.logo_uri,
    organization.logo_uri,
  );
  TestValidator.equals(
    "organization currency matches",
    detail.organization.currency_code,
    organization.currency_code,
  );
  TestValidator.equals(
    "organization timezone matches",
    detail.organization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal month matches",
    detail.organization.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.equals("email matches", detail.email, invitation.email);
  TestValidator.equals("status unchanged", detail.status, invitation.status);
  TestValidator.equals("message matches", detail.message, invitation.message);
  TestValidator.equals(
    "invited_at matches",
    detail.invited_at,
    invitation.invited_at,
  );
  TestValidator.equals(
    "created_at matches",
    detail.created_at,
    invitation.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    detail.updated_at,
    invitation.updated_at,
  );
  TestValidator.equals("role exists", detail.role !== null, true);
  if (detail.role === null) {
    throw new Error("Expected invitation role to be present");
  }
  const detailRole = detail.role;
  TestValidator.equals("role id matches", detailRole.id, role.id);
  TestValidator.equals("role name matches", detailRole.name, role.name);
  TestValidator.equals(
    "role built_in matches",
    detailRole.built_in,
    role.built_in,
  );
  TestValidator.equals(
    "role organization id matches",
    detailRole.organization.id,
    organization.id,
  );
  TestValidator.equals("accepted_at is null", detail.accepted_at, null);
  TestValidator.equals("resolved_at is null", detail.resolved_at, null);
  TestValidator.equals("expired_at is null", detail.expired_at, null);
  TestValidator.equals("cancelled_at is null", detail.cancelled_at, null);
  TestValidator.equals("deleted_at is null", detail.deleted_at, null);
  const detailAgain =
    await api.functional.hrmTimeTracking.owner.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(detailAgain);
  TestValidator.equals("read only retrieval", detailAgain, detail);
}
