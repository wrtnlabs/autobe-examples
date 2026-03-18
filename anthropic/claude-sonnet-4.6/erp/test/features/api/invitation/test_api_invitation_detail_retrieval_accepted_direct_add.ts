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

export async function test_api_invitation_detail_retrieval_accepted_direct_add(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (org owner / inviter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuthorized);
  // Step 2: Create an organization under member A
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a role with employee:manage permission
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        permissions: ["employee:manage"],
      },
      params: {
        organizationId: organization.id,
      },
    },
  );
  typia.assert(role);
  // Step 4: Register member B (the invitee who already has an account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // Step 5: Issue an invitation to member B's email (direct-add flow — immediately accepted)
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          roleId: role.id,
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
      memberAConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
      },
    );
  typia.assert(invitationDetail);
  // Verify status is 'accepted' (direct-add completes immediately)
  TestValidator.equals(
    "invitation status is accepted",
    invitationDetail.status,
    "accepted",
  );
  // Verify memberId is non-null (populated with member B's platform account ID)
  TestValidator.predicate(
    "memberId is non-null",
    invitationDetail.memberId !== null,
  );
  // Verify email matches member B's email address
  TestValidator.equals(
    "invitation email matches member B",
    invitationDetail.email,
    memberBEmail,
  );
  // Verify organization.id matches
  TestValidator.equals(
    "organization id matches",
    invitationDetail.organization.id,
    organization.id,
  );
}
