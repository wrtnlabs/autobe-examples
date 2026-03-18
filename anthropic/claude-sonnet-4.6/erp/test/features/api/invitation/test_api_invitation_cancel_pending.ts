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

export async function test_api_invitation_cancel_pending(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with employee:manage permission
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId: organization.id },
      body: {
        name: RandomGenerator.alphabets(8),
        permissions: ["employee:manage"],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create a pending invitation targeting an unregistered email
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: inviteeEmail,
          roleId: role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(invitation);
  // Verify invitation is pending
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation memberId is null",
    invitation.memberId,
    null,
  );
  // Main test: Cancel the pending invitation
  const cancelled =
    await api.functional.erpHrm.member.organizations.invitations.update(
      memberConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
        body: { status: "cancelled" } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  typia.assert(cancelled);
  // Verify the cancelled invitation fields
  TestValidator.equals(
    "cancelled invitation id matches",
    cancelled.id,
    invitation.id,
  );
  TestValidator.equals(
    "cancelled status is 'cancelled'",
    cancelled.status,
    "cancelled",
  );
  TestValidator.equals("email unchanged", cancelled.email, inviteeEmail);
  TestValidator.equals(
    "organization id matches",
    cancelled.organization.id,
    organization.id,
  );
  TestValidator.equals("memberId is still null", cancelled.memberId, null);
  TestValidator.predicate(
    "updated_at >= created_at",
    new Date(cancelled.updated_at) >= new Date(cancelled.created_at),
  );
  // Business rule: A cancelled invitation cannot be updated again (terminal state)
  await TestValidator.error("cannot update cancelled invitation", async () => {
    await api.functional.erpHrm.member.organizations.invitations.update(
      memberConnection,
      {
        organizationId: organization.id,
        invitationId: invitation.id,
        body: { status: "expired" } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  });
}
