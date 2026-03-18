import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_invitation_detail_retrieval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create a new organization (owner is automatically assigned Owner role with employee:manage)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with employee:manage permission (used as roleId when creating invitation)
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: `InvitationTestRole_${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["employee:manage"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // 4. Issue an invitation to an unregistered email address (pending flow)
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: invitedEmail,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(invitation);
  // Primary test: Retrieve the invitation detail
  const invitationDetail =
    await api.functional.erpHrm.member.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(invitationDetail);
  // Validate business logic
  TestValidator.equals(
    "invitation id matches",
    invitationDetail.id,
    invitation.id,
  );
  TestValidator.equals(
    "invitation email matches",
    invitationDetail.email,
    invitedEmail,
  );
  TestValidator.equals(
    "invitation status is pending",
    invitationDetail.status,
    "pending",
  );
  TestValidator.equals(
    "memberId is null for pending invitation",
    invitationDetail.memberId,
    null,
  );
  TestValidator.equals(
    "organization id matches",
    invitationDetail.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "invitingMember is populated",
    invitationDetail.invitingMember !== null &&
      invitationDetail.invitingMember !== undefined,
  );
  // Edge case: Data isolation — wrong organizationId should return 404
  await TestValidator.error("wrong organizationId returns error", async () => {
    await api.functional.erpHrm.member.organizations.invitations.at(
      ownerConnection,
      {
        organizationId: typia.random<string & tags.Format<"uuid">>(),
        invitationId: invitation.id,
      },
    );
  });
}
