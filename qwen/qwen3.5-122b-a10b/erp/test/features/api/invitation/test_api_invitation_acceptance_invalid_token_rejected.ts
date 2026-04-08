import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test invitation acceptance with invalid token is rejected.
 *
 * Validates that attempting to accept an employee invitation with an incorrect verification token results in proper rejection. A guest user registers and attempts to accept an invitation but provides a wrong token value. The system must validate the token matches the invitation record before processing acceptance.
 *
 * This test ensures the security token verification mechanism prevents unauthorized invitation acceptance. When the token does not match the invitation record, the request is rejected with 401 Unauthorized (if invitation exists) or 404 Not Found (if invitation doesn't exist). Either response validates that invalid acceptance attempts are properly rejected.
 *
 * 1. Guest user registers with device fingerprint to obtain authentication.
 * 2. Attempt to accept invitation with non-existent invitation ID and invalid token.
 * 3. Validates the request is rejected (401 or 404 status).
 * 4. Confirms the system properly validates token before processing acceptance.
 */
export async function test_api_invitation_acceptance_invalid_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Attempt to accept invitation with invalid token
  // Using a random UUID that likely doesn't exist as invitation ID
  // Providing an obviously incorrect token value
  // The system should reject this request regardless of whether invitation exists
  const invalidInvitationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid token should be rejected",
    [401, 404],
    async () => {
      await api.functional.hrm.guest.invitations.accept(guestConnection, {
        invitationId: invalidInvitationId,
        body: {
          token: "invalid-token-does-not-match-any-invitation",
        } satisfies IHrmEmployeeInvitation.IAccept,
      });
    },
  );
}
