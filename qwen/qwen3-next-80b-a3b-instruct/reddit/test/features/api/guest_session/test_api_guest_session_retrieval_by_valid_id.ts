import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate random guest credentials
  const guestCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformGuest.IJoin;
  // Step 3: Use utility function to create guest session (priority over SDK function)
  const guestSession = await authorize_guest_join(guestConnection, {
    body: guestCredentials,
  });
  typia.assert(guestSession);
  // Step 4: Create a new connection for session retrieval (isolated from authentication connection)
  const retrievalConnection: api.IConnection = { host: connection.host };
  // Step 5: Retrieve guest session using the sessionId from the created guest session
  const retrievedSession =
    await api.functional.communityPlatform.guest.guest.sessions.at(
      retrievalConnection,
      {
        sessionId: guestSession.id,
      },
    );
  typia.assert(retrievedSession);
  // Step 6: Validate essential business logic and data integrity
  // Confirm session ID is a valid UUID (already typed by typia.assert(), no additional validation needed)
  TestValidator.predicate(
    "session ID is valid UUID",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      retrievedSession.id,
    ),
  );
  // Validate session duration is reasonable (never exceeds 30 minutes timeout)
  const durationMs = retrievedSession.session_duration * 1000;
  const sessionAgeMs =
    new Date(retrievedSession.last_accessed_at).getTime() -
    new Date(retrievedSession.created_at).getTime();
  TestValidator.predicate(
    "session duration matches actual age",
    Math.abs(durationMs - sessionAgeMs) < 1000,
  );
  // Validate that is_expired is consistent with session access time (if access was 30+ minutes ago, it should be expired)
  const thirtyMinutesMs = 30 * 60 * 1000;
  const timeSinceLastAccessMs =
    Date.now() - new Date(retrievedSession.last_accessed_at).getTime();
  TestValidator.predicate(
    "is_expired logical consistency",
    (timeSinceLastAccessMs > thirtyMinutesMs &&
      retrievedSession.is_expired === true) ||
      (timeSinceLastAccessMs <= thirtyMinutesMs &&
        retrievedSession.is_expired === false),
  );
}
