import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
 * Test revoking a pending invitation successfully.
 *
 * This test validates the primary success path for invitation revocation:
 * 1. Authenticate as a member with employee:manage permission
 * 2. Create a pending invitation with a valid email address
 * 3. Verify the invitation was created with status 'pending'
 * 4. Revoke the invitation using POST /erpHrm/member/invitations/{invitationId}/revoke
 * 5. Validate the response contains the revoked invitation with deleted_at timestamp set
 */
export async function test_api_invitation_revoke_pending_invitation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a pending invitation
  const invitation = await generate_random_erp_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
      },
    },
  );
  typia.assert(invitation);
  // Step 3: Verify the invitation was created with status 'pending'
  TestValidator.equals(
    "invitation status is pending",
    invitation.status,
    "pending",
  );
  TestValidator.equals(
    "deleted_at is null before revoke",
    invitation.deleted_at,
    null,
  );
  // Step 4: Revoke the invitation
  const revokedInvitation =
    await api.functional.erpHrm.member.invitations.revoke(memberConnection, {
      invitationId: invitation.id,
    });
  typia.assert(revokedInvitation);
  // Step 5: Validate the response contains deleted_at timestamp set (soft delete)
  TestValidator.notEquals(
    "deleted_at is set after revoke",
    revokedInvitation.deleted_at,
    null,
  );
  TestValidator.equals(
    "invitation ID preserved",
    revokedInvitation.id,
    invitation.id,
  );
  TestValidator.equals(
    "invitation email preserved",
    revokedInvitation.email,
    invitation.email,
  );
}
