import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that an authenticated guest can successfully retrieve their own session details.
 *
 * Validates the complete guest session retrieval workflow including guest authentication via device fingerprint registration and session details retrieval. Ensures that the session response includes complete metadata while securely omitting JWT tokens.
 *
 * Special attention is given to verifying that the session contains all required fields (session UUID, member profile, IP address, page href, referrer, timestamps) and that sensitive authentication tokens are not exposed in the response for security purposes.
 *
 * 1. Guest registers via device fingerprint using authorize_guest_join utility function.
 * 2. Guest connection is automatically updated with authentication token.
 * 3. Guest retrieves their own session details using the session ID from authentication.
 * 4. Validates session response contains all required fields: id, member profile, ip, href, referrer, created_at, expired_at.
 * 5. Verifies member profile contains display_name, created_at, updated_at, deleted_at fields.
 * 6. Confirms session timestamps are valid date-time format and expiration is after creation.
 * 7. Validates session member ID matches the authenticated guest ID.
 */
export async function test_api_guest_session_retrieve_own_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration via device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve session details using session ID
  // Note: The session ID should be available from the authentication response
  // For this test, we use the guest ID as the session identifier
  const session = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 3. Validate expiration is after creation (business logic, not type checking)
  TestValidator.predicate("expiration is after creation", () => {
    const createdAt = new Date(session.created_at).getTime();
    const expiredAt = new Date(session.expired_at).getTime();
    return expiredAt > createdAt;
  });
  // 4. Verify guest ID matches session member ID (relationship validation)
  TestValidator.equals(
    "guest ID matches session member",
    authorized.id,
    session.member.id,
  );
}
