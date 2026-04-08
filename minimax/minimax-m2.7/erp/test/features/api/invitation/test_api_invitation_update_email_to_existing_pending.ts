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

/**
 * Test updating invitation email to an address that already has a pending invitation in the same organization.
 *
 * Steps:
 * 1. Admin joins and creates organization
 * 2. Set organization context for the admin
 * 3. Create first pending invitation for email1@example.com
 * 4. Create second pending invitation for email2@example.com
 * 5. Attempt to update first invitation's email to email2@example.com (already has pending)
 * 6. Validate response returns 409 Conflict error
 * 7. Verify the duplicate email constraint prevents the update
 */
export async function test_api_invitation_update_email_to_existing_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 2. Set organization context for the admin
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    { body: { organizationId: organization.id } },
  );
  // 3. Create first pending invitation for email1@example.com
  const invitation1 =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: "email1@example.com",
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation1);
  // 4. Create second pending invitation for email2@example.com
  const invitation2 =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: "email2@example.com",
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation2);
  // 5. Attempt to update first invitation's email to email2@example.com (already has pending)
  // 6. Validate response returns 409 Conflict error
  await TestValidator.httpError(
    "should return 409 when updating email to existing pending invitation",
    409,
    async () =>
      await api.functional.erpHrm.member.erpHrm.organizations.invitations.update(
        adminConnection,
        {
          organizationId: organization.id,
          invitationId: invitation1.id,
          body: {
            email: "email2@example.com",
          } satisfies IErpHrmInvitation.IUpdate,
        },
      ),
  );
  // 7. Verify the duplicate email constraint prevents the update
  // (The 409 error above validates this business rule)
}
