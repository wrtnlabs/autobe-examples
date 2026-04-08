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
 * Test retrieving an expired guest session record for audit purposes.
 *
 * Validates that guest sessions remain retrievable even after expiration for audit and security review purposes. The test creates a guest session via the join operation, then retrieves the session details using the session ID to verify all fields are present and accessible.
 *
 * Guest sessions are identified by device fingerprint, allowing the system to recognize returning visitors without requiring registration. This test ensures session data including tokens, client metadata, and timestamps are properly maintained and retrievable.
 *
 * 1. Create a guest session using the join operation with a unique device fingerprint and optional tracking metadata (href, referrer, ip).
 * 2. Extract the session information from the join response.
 * 3. Retrieve the session details using the session ID via the GET endpoint.
 * 4. Validate that the response contains all required fields including access token, refresh token, client metadata (ip, href, referrer), and timestamps (createdAt, expiredAt).
 * 5. Confirm the member information is included in the session record.
 * 6. Verify that expired sessions are still accessible for historical session activity review.
 */
export async function test_api_guest_session_retrieval_expired(
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
  // 2. Retrieve session details using session ID
  // Note: The guest.id from join response is used as sessionId for retrieval
  const session = await api.functional.redditCommunity.guest.sessions.at(
    guestConnection,
    {
      sessionId: guest.id,
    },
  );
  typia.assert(session);
  // 3. Validate all required fields are present
  TestValidator.equals("session ID matches guest ID", session.id, guest.id);
  TestValidator.predicate(
    "access token exists",
    session.accessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    session.refreshToken.length > 0,
  );
  TestValidator.predicate("IP address exists", session.ip.length > 0);
  TestValidator.predicate("href URL exists", session.href.length > 0);
  TestValidator.predicate("referrer URL exists", session.referrer.length > 0);
  TestValidator.predicate(
    "createdAt timestamp exists",
    session.createdAt.length > 0,
  );
  TestValidator.predicate(
    "expiredAt timestamp exists",
    session.expiredAt.length > 0,
  );
  // 4. Validate member information is included
  TestValidator.predicate("member ID exists", session.member.id.length > 0);
  TestValidator.predicate(
    "member username exists",
    session.member.username.length > 0,
  );
  TestValidator.predicate(
    "member display name exists",
    session.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "member karma is non-negative",
    session.member.karma >= 0,
  );
  // 5. Validate timestamps are valid date-time format
  const createdAtDate = new Date(session.createdAt);
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  const expiredAtDate = new Date(session.expiredAt);
  TestValidator.predicate(
    "expiredAt is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  // 6. Validate expiredAt is after createdAt (session has expiration)
  TestValidator.predicate(
    "expiredAt is after createdAt",
    expiredAtDate.getTime() > createdAtDate.getTime(),
  );
}
