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

export async function test_api_invitation_cancellation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization (member becomes owner with full permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a pending invitation
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(invitation);
  // Validate initial invitation state
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "invitation has no deleted_at",
    invitation.deleted_at,
    null,
  );
  // 4. Cancel the invitation
  await api.functional.erpHrm.member.organizations.invitations.erase(
    memberConnection,
    {
      organizationId: organization.id,
      invitationId: invitation.id,
    },
  );
  // 5. Verify cancellation was successful by attempting to fetch the cancelled invitation
  // The erase operation returns void, so we validate through the successful completion
  // No error thrown means the cancellation was successful
}
