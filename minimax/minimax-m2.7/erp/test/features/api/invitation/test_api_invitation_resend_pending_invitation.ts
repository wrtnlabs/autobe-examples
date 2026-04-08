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

export async function test_api_invitation_resend_pending_invitation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Set organization context for member to get organization ID
  // This also ensures member belongs to an organization with proper permissions
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {},
    );
  typia.assert(orgContext);
  const organizationId = orgContext.organization.id;
  // 4. Create a pending invitation (non-existing email to ensure pending status)
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          email: invitationEmail,
        },
      },
    );
  typia.assert(invitation);
  // Store original values for comparison
  const originalToken = invitation.token;
  const originalUpdatedAt = invitation.updated_at;
  const originalId = invitation.id;
  const originalStatus = invitation.status;
  // 5. Resend the invitation using admin connection
  const resendResponse = await api.functional.erpHrm.admin.invitations.resend(
    adminConnection,
    {
      invitationId: originalId,
    },
  );
  typia.assert(resendResponse);
  // 6. Validate resend response
  // Token should be regenerated (different from original if both exist)
  if (
    originalToken !== undefined &&
    originalToken !== null &&
    resendResponse.token !== null
  ) {
    TestValidator.notEquals(
      "token should be regenerated",
      originalToken,
      resendResponse.token,
    );
  }
  // Token should exist and be non-null after resend
  TestValidator.predicate(
    "token exists after resend",
    resendResponse.token !== null,
  );
  // updatedAt should be refreshed (newer timestamp)
  TestValidator.predicate(
    "updatedAt should be refreshed",
    new Date(resendResponse.updatedAt) > new Date(originalUpdatedAt),
  );
  // Status should remain 'pending'
  TestValidator.equals(
    "status remains pending",
    resendResponse.status,
    "pending",
  );
  // Response should include organization details
  TestValidator.equals(
    "organization id matches",
    resendResponse.organization.id,
    organizationId,
  );
  // Email should match original
  TestValidator.equals("email matches", resendResponse.email, invitationEmail);
  // ID should remain the same
  TestValidator.equals("id remains unchanged", resendResponse.id, originalId);
  // Verify original invitation was pending (for non-existing user scenario)
  TestValidator.equals(
    "original status was pending",
    originalStatus,
    "pending",
  );
}
