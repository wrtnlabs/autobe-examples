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

export async function test_api_invitation_reject_pending(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member (will be the organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create a new organization (owner gets full admin permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with `employee:manage` permission
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    ownerConnection,
    {
      params: { organizationId: organization.id },
      body: {
        permissions: ["employee:manage"],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create first pending invitation targeting a non-existing email
  const invitation1 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          roleId: role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(invitation1);
  TestValidator.equals(
    "invitation1 initial status is pending",
    invitation1.status,
    "pending",
  );
  // Step 5: Main test — reject the pending invitation
  const rejected =
    await api.functional.erpHrm.member.organizations.invitations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation1.id,
        body: { status: "rejected" } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  typia.assert(rejected);
  // Validate status changed to rejected
  TestValidator.equals("status is rejected", rejected.status, "rejected");
  // Validate immutable fields unchanged
  TestValidator.equals("invitation id unchanged", rejected.id, invitation1.id);
  TestValidator.equals(
    "invitation email unchanged",
    rejected.email,
    invitation1.email,
  );
  TestValidator.equals(
    "organization id unchanged",
    rejected.organization.id,
    invitation1.organization.id,
  );
  TestValidator.equals(
    "memberId unchanged",
    rejected.memberId,
    invitation1.memberId,
  );
  // Validate updated_at >= created_at
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(rejected.updated_at) >= new Date(rejected.created_at),
  );
  // Validate invitingMember.id matches the owner's org member ID
  TestValidator.equals(
    "invitingMember id matches owner org member",
    rejected.invitingMember.id,
    organization.owner.id,
  );
  // Step 6: Create second pending invitation for expired transition
  const invitation2 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          roleId: role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(invitation2);
  TestValidator.equals(
    "invitation2 initial status is pending",
    invitation2.status,
    "pending",
  );
  // Step 7: Transition second invitation to expired
  const expired =
    await api.functional.erpHrm.member.organizations.invitations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        invitationId: invitation2.id,
        body: { status: "expired" } satisfies IErpHrmInvitation.IUpdate,
      },
    );
  typia.assert(expired);
  // Validate status changed to expired
  TestValidator.equals("status is expired", expired.status, "expired");
  TestValidator.predicate(
    "expired updated_at is not before created_at",
    new Date(expired.updated_at) >= new Date(expired.created_at),
  );
}
