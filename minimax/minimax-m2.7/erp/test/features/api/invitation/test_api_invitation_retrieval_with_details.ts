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

export async function test_api_invitation_retrieval_with_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Set organization context to the created organization
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 4. Create an invitation with pre-assigned role and department
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          position: "Software Engineer",
          note: "Welcome to our team!",
        },
      },
    );
  typia.assert(invitation);
  // 5. Call GET /erpHrm/member/erpHrm/organizations/{organizationId}/invitations/{invitationId}
  const retrievedInvitation =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.at(
      memberConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(retrievedInvitation);
  // 6. Validate response
  TestValidator.equals(
    "invitation id matches",
    retrievedInvitation.id,
    invitation.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedInvitation.email,
    invitation.email,
  );
  TestValidator.equals(
    "status matches",
    retrievedInvitation.status,
    invitation.status,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedInvitation.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "position matches",
    retrievedInvitation.position,
    invitation.position,
  );
  TestValidator.equals(
    "note matches",
    retrievedInvitation.note,
    invitation.note,
  );
  TestValidator.predicate(
    "has valid token for pending invitation",
    retrievedInvitation.token !== null &&
      retrievedInvitation.token !== undefined,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedInvitation.created_at !== null &&
      retrievedInvitation.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedInvitation.updated_at !== null &&
      retrievedInvitation.updated_at !== undefined,
  );
}
