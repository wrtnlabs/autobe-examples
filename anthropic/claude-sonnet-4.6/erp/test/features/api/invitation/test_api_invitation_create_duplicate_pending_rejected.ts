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

export async function test_api_invitation_create_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create an organization (the owner is now the authenticated member)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role within the organization
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    ownerConnection,
    {
      params: { organizationId: organization.id },
    },
  );
  typia.assert(role);
  // 4. Choose a unique unregistered email for the invitation target
  const targetEmail = typia.random<string & tags.Format<"email">>();
  // 5. Issue the first invitation (should succeed with status 'pending')
  const firstInvitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: targetEmail,
          roleId: role.id,
          employmentType: "full-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(firstInvitation);
  // Validate the first invitation is pending
  TestValidator.equals(
    "first invitation status is pending",
    firstInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "first invitation email matches",
    firstInvitation.email,
    targetEmail,
  );
  // 6. Attempt to issue a second invitation with the same email — expect 409 Conflict
  await TestValidator.httpError(
    "duplicate pending invitation is rejected with 409",
    409,
    async () => {
      await generate_random_erp_hrm_member_organizations_invitations_create(
        ownerConnection,
        {
          body: {
            email: targetEmail,
            roleId: role.id,
            employmentType: "full-time",
          },
          params: { organizationId: organization.id },
        },
      );
    },
  );
}
