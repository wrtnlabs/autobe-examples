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
import { generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_invitation_resend_different_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Admin A for Organization A
  const adminAConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminAConnection, {});
  // 2. Set organization context to Organization A (admin automatically becomes owner)
  const orgContextA =
    await generate_random_erp_hrm_member_organization_context_select(
      adminAConnection,
      {},
    );
  const organizationAId = orgContextA.organization.id;
  // 3. Create pending invitation in Organization A
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminAConnection,
      {
        params: { organizationId: organizationAId },
      },
    );
  // 4. Create Admin B for Organization B
  const adminBConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminBConnection, {});
  // 5. Set organization context to Organization B
  await generate_random_erp_hrm_member_organization_context_select(
    adminBConnection,
    {},
  );
  // 6. Attempt to resend Organization A's invitation using Admin B's connection
  // This should fail with 404 due to organization context mismatch
  await TestValidator.httpError(
    "invitation from different organization not accessible",
    404,
    async () =>
      await api.functional.erpHrm.admin.invitations.resend(adminBConnection, {
        invitationId: invitation.id,
      }),
  );
}
