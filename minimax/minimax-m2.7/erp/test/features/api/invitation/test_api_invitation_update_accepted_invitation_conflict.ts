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
 * Test updating an accepted invitation returns 409 Conflict error.
 *
 * Scenario:
 * 1. Authenticate as member1 (inviter)
 * 2. Create member2 account (invitee)
 * 3. Create invitation from member1 to member2's email (auto-accepts since user exists)
 * 4. Attempt to update the accepted invitation with PUT /erpHrm/member/invitations/{invitationId}
 * 5. Validate: 409 Conflict response indicating invitation cannot be modified because status is not 'pending'
 */
export async function test_api_invitation_update_accepted_invitation_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member1 (inviter)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // Step 2: Create member2 account (invitee)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // Step 3: Create invitation from member1 to member2's email (auto-accepts)
  const invitation = await api.functional.erpHrm.member.invitations.create(
    member1Connection,
    {
      body: {
        email: member2.email,
        position: RandomGenerator.paragraph({ sentences: 1 }),
        note: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // Validate the invitation is accepted (auto-accepted because user exists)
  TestValidator.equals(
    "invitation status should be accepted",
    invitation.status,
    "accepted",
  );
  TestValidator.notEquals(
    "accepted_at should be set",
    invitation.accepted_at,
    null,
  );
  // Step 4 & 5: Attempt to update the accepted invitation, expect 409 Conflict
  await TestValidator.httpError(
    "cannot update accepted invitation",
    409,
    async () => {
      await api.functional.erpHrm.member.invitations.update(member1Connection, {
        invitationId: invitation.id,
        body: {
          position: "Updated Position",
          note: "Updated note",
        } satisfies IErpHrmInvitation.IUpdate,
      });
    },
  );
}
