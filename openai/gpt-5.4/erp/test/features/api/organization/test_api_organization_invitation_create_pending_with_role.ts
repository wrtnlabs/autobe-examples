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

export async function test_api_organization_invitation_create_pending_with_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
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
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
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
          name: `Role ${RandomGenerator.name()}`,
          permissions: [
            {
              permissions: ["employee:view", "time:view_all"],
            },
          ],
        },
      },
    );
  typia.assert(role);
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitationMessage = RandomGenerator.paragraph({ sentences: 4 });
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
  TestValidator.equals(
    "invitation organization id matches target organization",
    invitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "invitation organization name matches target organization",
    invitation.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "invitation organization currency matches target organization",
    invitation.organization.currency_code,
    organization.currency_code,
  );
  TestValidator.equals(
    "invitation organization timezone matches target organization",
    invitation.organization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "invitation organization fiscal month matches target organization",
    invitation.organization.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.predicate(
    "invitation role is preselected",
    invitation.role !== null,
  );
  if (invitation.role !== null) {
    TestValidator.equals(
      "invitation role id matches created role",
      invitation.role.id,
      role.id,
    );
    TestValidator.equals(
      "invitation role name matches created role",
      invitation.role.name,
      role.name,
    );
    TestValidator.equals(
      "invitation role built_in matches created role",
      invitation.role.built_in,
      role.built_in,
    );
    TestValidator.equals(
      "invitation role organization id matches target organization",
      invitation.role.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "invitation role organization name matches target organization",
      invitation.role.organization.name,
      organization.name,
    );
  }
  TestValidator.equals(
    "invitation email matches invited email",
    invitation.email,
    invitedEmail,
  );
  TestValidator.equals(
    "invitation message matches input",
    invitation.message,
    invitationMessage,
  );
  TestValidator.equals(
    "invitation starts pending",
    invitation.status,
    "pending",
  );
  TestValidator.predicate(
    "invitation invited_at is populated",
    invitation.invited_at.length > 0,
  );
  TestValidator.predicate(
    "invitation created_at is populated",
    invitation.created_at.length > 0,
  );
  TestValidator.predicate(
    "invitation updated_at is populated",
    invitation.updated_at.length > 0,
  );
  TestValidator.equals(
    "invitation accepted_at is null before resolution",
    invitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "invitation resolved_at is null before resolution",
    invitation.resolved_at,
    null,
  );
  TestValidator.equals(
    "invitation expired_at is null when newly created",
    invitation.expired_at,
    null,
  );
  TestValidator.equals(
    "invitation cancelled_at is null when newly created",
    invitation.cancelled_at,
    null,
  );
  TestValidator.equals(
    "invitation deleted_at is null when newly created",
    invitation.deleted_at,
    null,
  );
  TestValidator.predicate(
    "pending invitation remains unresolved and therefore does not indicate immediate membership creation",
    invitation.status === "pending" &&
      invitation.accepted_at === null &&
      invitation.resolved_at === null,
  );
}
