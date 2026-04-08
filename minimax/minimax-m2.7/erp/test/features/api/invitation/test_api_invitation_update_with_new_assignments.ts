import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_invitation_update_with_new_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    {
      body: { organizationId: organization.id },
    },
  );
  // 4. Create pending invitation for non-existing user
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminConnection,
      {
        params: { organizationId: organization.id },
        body: { email: invitationEmail },
      },
    );
  typia.assert(invitation);
  // 5. Verify invitation status is 'pending' and capture original timestamp
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  const originalUpdatedAt = invitation.updated_at;
  // 6. Update invitation with new role, department, position, and note
  const updatedPosition = RandomGenerator.name();
  const updatedNote = RandomGenerator.paragraph({ sentences: 2 });
  const updatedInvitation =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.update(
      adminConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
        body: {
          position: updatedPosition,
          note: updatedNote,
        } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  // 7-10. Validate response
  TestValidator.equals(
    "invitation status remains pending",
    updatedInvitation.status,
    "pending",
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedInvitation.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "position updated correctly",
    updatedInvitation.position,
    updatedPosition,
  );
  TestValidator.equals(
    "note updated correctly",
    updatedInvitation.note,
    updatedNote,
  );
}
