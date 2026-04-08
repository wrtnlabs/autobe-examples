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

export async function test_api_invitation_new_user_pending_invitation_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Get the admin's organization ID from their profile
  // Note: Admin join creates an organization with the admin as owner
  // The organization ID should be derived from the admin context
  // For this test, we need to set organization context first
  // Since we need the actual organization, we'll use the admin's ID to create organization context
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      adminConnection,
      {
        body: {
          organizationId: (admin as any).employee?.organization?.id ?? admin.id,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  // 3. Generate a unique email that doesn't exist in the system
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  // 4. Create invitation for non-existent email
  const invitation =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.create(
      adminConnection,
      {
        organizationId: orgContext.organization.id,
        body: {
          email: newUserEmail,
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Validate invitation fields
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.predicate(
    "token is generated",
    invitation.token !== null && invitation.token !== undefined,
  );
  TestValidator.predicate(
    "expiration is set",
    invitation.expires_at !== null && invitation.expires_at !== undefined,
  );
  TestValidator.equals(
    "email matches input",
    invitation.email,
    typia.assert<string & tags.Format<"idn-email">>(newUserEmail),
  );
  TestValidator.predicate(
    "organization is associated",
    invitation.organization !== null && invitation.organization !== undefined,
  );
  TestValidator.equals(
    "organization ID matches",
    invitation.organization.id,
    orgContext.organization.id,
  );
}