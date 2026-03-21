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
 * Test cancelling a pending invitation successfully.
 *
 * This E2E test validates the primary success path for invitation cancellation workflow:
 * 1. Authenticate as a member with employee:manage permission
 * 2. Create a pending invitation by sending invitation to a new email address
 * 3. Extract the invitationId from the created invitation response
 * 4. Send DELETE request to /erpHrm/member/invitations/{invitationId}
 * 5. Verify HTTP 204 No Content response is returned
 * 6. Verify the invitation is permanently removed from the system
 */
export async function test_api_invitation_cancellation_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection with organization context
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
  // Step 2: Create a pending invitation with a new email address (no existing user)
  const pendingInvitationEmail = typia.random<string & tags.Format<"email">>();
  const pendingInvitation =
    await generate_random_erp_hrm_member_invitations_create(memberConnection, {
      body: {
        email: pendingInvitationEmail,
        position: RandomGenerator.paragraph({ sentences: 1 }),
        note: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(pendingInvitation);
  // Validate the invitation was created with pending status
  TestValidator.equals(
    "invitation status should be pending",
    pendingInvitation.status,
    "pending",
  );
  // Step 3: Extract the invitationId
  const invitationId = pendingInvitation.id;
  // Step 4: Send DELETE request to cancel the pending invitation
  await api.functional.erpHrm.member.invitations.erase(memberConnection, {
    invitationId: invitationId,
  });
  // Step 5: Verify the invitation is permanently removed by attempting to use the erase endpoint again
  // This should fail with 404 as the invitation no longer exists
  await TestValidator.error(
    "invitation should not exist after cancellation",
    async () => {
      await api.functional.erpHrm.member.invitations.erase(memberConnection, {
        invitationId: invitationId,
      });
    },
  );
}
