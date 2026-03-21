import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
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
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_invitation_cancellation_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinResult = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerJoinResult);
  // Step 2: Create an organization (owner has employee:manage permission by default)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a pending invitation
  // Note: When organization is created, built-in roles (Owner, Manager, Employee) are created
  // We use a random UUID for roleId - backend validates role existence
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const invitationRoleId = typia.random<string & tags.Format<"uuid">>();
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          email: invitationEmail,
          roleId: invitationRoleId,
        },
      },
    );
  typia.assert(invitation);
  // Step 4: Verify invitation is in pending status before cancellation
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation deleted_at is null before cancellation",
    invitation.deleted_at,
    null,
  );
  // Step 5: Cancel the invitation using owner connection (has employee:manage permission)
  await api.functional.erpHrm.member.organizations.invitations.erase(
    ownerConnection,
    {
      organizationId: organization.id,
      invitationId: invitation.id,
    },
  );
}
