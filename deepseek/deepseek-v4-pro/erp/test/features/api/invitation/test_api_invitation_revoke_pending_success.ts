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
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";

/**
 * Test revocation of a pending employee invitation and verify it cannot be fulfilled.
 *
 * Validates the complete invitation revocation flow: authenticating a member with
 * employee:manage permission, creating a pending invitation targeting a specific
 * email address, revoking it via the delete endpoint, and confirming the invitation
 * is no longer actionable.
 *
 * After revocation, a subsequent signup with the same email address should result
 * in a member with an empty organizations array — proving the revoked invitation
 * did not auto-grant organization membership.
 *
 * 1. Authenticate the member via authorize_member_join.
 * 2. Create a pending invitation with a known email using the generation utility.
 * 3. Revoke the invitation by calling the erase endpoint with the invitation's ID.
 * 4. Sign up a new member with the same email and assert zero organizations.
 */
export async function test_api_invitation_revoke_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a pending invitation with a known email
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: invitationEmail,
      },
    },
  );
  typia.assert(invitation);
  // 3. Revoke the pending invitation
  await api.functional.erpHrm.member.invitations.erase(memberConnection, {
    invitationId: invitation.id,
  });
  // 4. Confirm the invitation can no longer be fulfilled
  const signupConnection: api.IConnection = { host: connection.host };
  const newMember = await authorize_member_join(signupConnection, {
    body: {
      email: invitationEmail,
    },
  });
  typia.assert(newMember);
  TestValidator.equals(
    "revoked invitation should not auto-grant organization membership",
    newMember.organizations.length,
    0,
  );
}
