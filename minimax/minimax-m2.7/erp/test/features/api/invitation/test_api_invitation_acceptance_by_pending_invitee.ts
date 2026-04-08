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

export async function test_api_invitation_acceptance_by_pending_invitee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (invitee) who will receive the invitation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: "Test Invitee",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberJoinResult);
  // Step 2: Register admin and create organization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(adminJoinResult);
  // Create organization using admin
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: {
        name: "Test Organization for Invitation",
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
        description: "Organization for testing invitation acceptance",
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // Step 3: Set organization context for admin to send invitation
  // Admin already has token from join, use adminConnection directly
  await api.functional.erpHrm.member.organization_context.select(
    adminConnection,
    {
      body: {
        organizationId: organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // Send invitation to member's email
  const invitation =
    await api.functional.erpHrm.member.erpHrm.organizations.invitations.create(
      adminConnection,
      {
        organizationId: organization.id,
        body: {
          email: memberEmail,
          note: "Welcome to our organization!",
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Validate invitation was created with pending status
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    memberEmail as string & tags.Format<"idn-email">,
  );
  // Step 4: Member logs in to accept the invitation
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IErpHrmMember.ILogin,
  });
  // Step 5: Accept the invitation
  const acceptedInvitation =
    await api.functional.erpHrm.member.invitations.accept(
      memberLoginConnection,
      {
        token: invitation.token!,
      },
    );
  typia.assert(acceptedInvitation);
  // Validate the accepted invitation
  TestValidator.equals(
    "invitation status is accepted",
    acceptedInvitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "accepted_at timestamp is set",
    acceptedInvitation.accepted_at !== null &&
      acceptedInvitation.accepted_at !== undefined,
  );
  TestValidator.equals(
    "invitation email matches member email",
    acceptedInvitation.email,
    memberEmail as string & tags.Format<"idn-email">,
  );
}