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

export async function test_api_invitation_update_terminal_state_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a new organization (owner becomes Owner with full permissions)
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
      body: {
        name: `role-${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:manage"],
      },
      params: {
        organizationId: organization.id,
      },
    },
  );
  typia.assert(role);
  // Step 4: Register a second member (already-registered platform user)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(secondMemberConnection, {
    body: {
      email: secondMemberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 5: Invite the second member's email — triggers direct-add flow (invitation immediately accepted)
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondMemberEmail,
          roleId: role.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(invitation);
  // Verify the invitation is in the `accepted` state due to direct-add flow
  TestValidator.equals(
    "invitation status is accepted",
    invitation.status,
    "accepted",
  );
  // Step 6 & 7: Attempt to update the accepted (terminal state) invitation → expect 422
  await TestValidator.httpError(
    "cannot update invitation in terminal accepted state",
    422,
    async () => {
      await api.functional.erpHrm.member.organizations.invitations.update(
        ownerConnection,
        {
          organizationId: organization.id,
          invitationId: invitation.id,
          body: {
            status: "cancelled",
          } satisfies IErpHrmInvitation.IUpdate,
        },
      );
    },
  );
}
