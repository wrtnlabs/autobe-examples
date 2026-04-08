import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving detailed information for an active guest session.
 *
 * Validates the complete guest session retrieval workflow including guest session creation, session lookup by ID, and response structure validation. Ensures that the session endpoint returns all required fields with correct data types and that the session is properly associated with the guest account.
 *
 * Special attention is given to verifying that the session contains valid authentication tokens, client metadata (IP, href, referrer), and accurate timestamps. The test confirms the session is active by checking the expiration timestamp is in the future.
 *
 * 1. Create guest session via join operation to obtain guest ID and tokens.
 * 2. Retrieve session details using the guest ID as session identifier.
 * 3. Validate response includes all required fields: session ID, access token, refresh token, client IP, href, referrer, created_at, and expired_at.
 * 4. Verify member information is included with username, display name, bio, avatar, karma, and created_at.
 * 5. Confirm the session is active by checking expired_at is in the future.
 */
export async function test_api_guest_session_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Retrieve session details using guest ID
  const session = await api.functional.redditCommunity.guest.sessions.at(
    guestConnection,
    {
      sessionId: guest.id,
    },
  );
  typia.assert(session);
  // 3. Validate business logic: session ID correlation
  TestValidator.equals("session ID matches guest ID", session.id, guest.id);
  // 4. Verify session is active (not expired)
  const now = new Date().toISOString();
  TestValidator.predicate(
    "session is active (not expired)",
    session.expiredAt > now,
  );
}
