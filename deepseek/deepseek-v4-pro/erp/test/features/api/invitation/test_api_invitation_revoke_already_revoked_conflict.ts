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
 * Test that revoking an already-revoked invitation returns 409 Conflict.
 *
 * Validates the invitation revocation lifecycle's conflict detection: once an
 * invitation has been revoked, subsequent revocation attempts are rejected. The
 * test establishes the pre-state by creating a pending invitation, then revokes
 * it successfully, and finally verifies that a second revocation raises a 409
 * Conflict error.
 *
 * 1. Authenticate a member with employee:manage permission via join.
 * 2. Create a pending invitation scoped to the member's organization.
 * 3. Revoke the invitation successfully (first revocation).
 * 4. Attempt a second revocation — expects 409 Conflict.
 */
export async function test_api_invitation_revoke_already_revoked_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a pending invitation
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {},
  );
  typia.assert(invitation);
  // 3. Revoke the invitation for the first time
  await api.functional.erpHrm.member.invitations.erase(memberConnection, {
    invitationId: invitation.id,
  });
  // 4. Attempt to revoke again — expect 409 Conflict
  await TestValidator.httpError(
    "already revoked invitation should return 409",
    409,
    async () => {
      await api.functional.erpHrm.member.invitations.erase(memberConnection, {
        invitationId: invitation.id,
      });
    },
  );
}
