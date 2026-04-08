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

export async function test_api_invitation_update_forbidden_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create organization (admin becomes owner)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Admin sets organization context
  const adminOrgContextConnection: api.IConnection = { host: connection.host };
  adminOrgContextConnection.headers = { ...adminConnection.headers };
  await generate_random_erp_hrm_member_organization_context_select(
    adminOrgContextConnection,
    {
      body: { organizationId: organization.id },
    },
  );
  // 4. Admin creates a pending invitation
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminOrgContextConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          position: "Engineer",
          note: "Looking for experienced developer",
        },
      },
    );
  // 5. Create member without employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 6. Member sets organization context
  const memberOrgContextConnection: api.IConnection = { host: connection.host };
  memberOrgContextConnection.headers = { ...memberConnection.headers };
  await generate_random_erp_hrm_member_organization_context_select(
    memberOrgContextConnection,
    {
      body: { organizationId: organization.id },
    },
  );
  // 7. Member attempts to update invitation (should fail with 403)
  await TestValidator.error(
    "update invitation without employee:manage permission should return 403",
    async () => {
      await api.functional.erpHrm.member.erpHrm.organizations.invitations.update(
        memberOrgContextConnection,
        {
          organizationId: organization.id,
          invitationId: invitation.id,
          body: {
            position: "Senior Engineer",
            note: "Updated note",
          } satisfies IErpHrmInvitation.IUpdate,
        },
      );
    },
  );
  // 8. Verify invitation remains unchanged by updating with admin (should succeed)
  const updatedInvitation =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.update(
      adminOrgContextConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
        body: {
          position: "Senior Engineer",
          note: "Updated note by admin",
        } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  typia.assert(updatedInvitation);
  TestValidator.equals(
    "position updated by admin",
    updatedInvitation.position,
    "Senior Engineer",
  );
  TestValidator.equals(
    "note updated by admin",
    updatedInvitation.note,
    "Updated note by admin",
  );
}
