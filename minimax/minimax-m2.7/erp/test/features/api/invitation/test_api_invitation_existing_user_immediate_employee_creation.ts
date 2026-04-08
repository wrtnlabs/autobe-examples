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

export async function test_api_invitation_existing_user_immediate_employee_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create organization with admin as owner
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Admin sets organization context to get employee:manage permission
  const orgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(orgContext);
  // 4. Create a second member account (existing user to be invited)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  // 5. Admin creates invitation for existing member's email
  const invitation =
    await generate_random_erp_hrm_member_erp_hrm_organizations_invitations_create(
      adminConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          email: memberAuth.email,
          position: "Software Engineer",
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 6. Verify invitation is accepted immediately for existing user
  TestValidator.equals(
    "invitation status should be accepted",
    invitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "accepted_at timestamp should be set",
    invitation.accepted_at !== null && invitation.accepted_at !== undefined,
  );
  TestValidator.equals(
    "invitation email matches invited member",
    invitation.email,
    typia.assert<string & tags.Format<"idn-email">>(memberAuth.email),
  );
  TestValidator.equals(
    "position assigned correctly",
    invitation.position,
    "Software Engineer",
  );
  // 7. Verify member can now switch organization context to the new organization
  // This proves the employee record was created successfully
  const memberOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
        } satisfies IErpHrmOrganizationContext.ICreate,
      },
    );
  typia.assert(memberOrgContext);
  // 8. Verify employee record details
  TestValidator.equals(
    "employee status should be active",
    memberOrgContext.employee.status,
    "active",
  );
  TestValidator.equals(
    "employee position matches invitation",
    memberOrgContext.employee.position,
    "Software Engineer",
  );
  TestValidator.equals(
    "employee belongs to correct member",
    memberOrgContext.employee.member.email,
    memberAuth.email,
  );
}