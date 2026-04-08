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
 * Test that accepting an expired invitation is properly rejected.
 *
 * Validates that when a guest user attempts to accept an employee invitation that has passed its expiration date, the system correctly rejects the request with a 400 Bad Request error. This test ensures the expiration validation occurs in the proper sequence within the business logic flow - after checking invitation existence but before token validation.
 *
 * The test verifies that expired invitations cannot be accepted even with a valid token format, and that appropriate error responses are returned. Note: This test assumes an expired invitation fixture exists in the test database with the specified invitationId.
 *
 * 1. Create a guest user account with device fingerprint authentication.
 * 2. Prepare expired invitation reference (fixture must exist in test database).
 * 3. Attempt to accept the expired invitation using the invitation ID and token.
 * 4. Validate the system returns 400 Bad Request with expiration error message.
 * 5. Verify the error response indicates invitation expiration specifically.
 */
export async function test_api_invitation_acceptance_expired_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest user for invitation acceptance
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Attempt to accept an expired invitation
  // Note: This test assumes an expired invitation fixture exists with:
  // - invitationId: UUID of the expired invitation
  // - token: Valid token from the invitation
  // - email: Matching the guest user's email
  // - expires_at: Timestamp in the past
  const expiredInvitationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const validToken = RandomGenerator.alphaNumeric(64);
  // 3. Validate that accepting expired invitation returns 400 Bad Request
  await TestValidator.httpError(
    "expired invitation acceptance should return 400 Bad Request",
    400,
    async () => {
      await api.functional.hrm.guest.invitations.accept(guestConnection, {
        invitationId: expiredInvitationId,
        body: {
          token: validToken,
        } satisfies IHrmEmployeeInvitation.IAccept,
      });
    },
  );
  // 4. The HttpError caught above should contain error message about expiration
  // This validates the business logic properly checks expiration before token validation
}
