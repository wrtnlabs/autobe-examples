import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

export async function test_api_guest_user_token_refresh_session_state_updates(
  connection: api.IConnection,
) {
  // 1. Create initial guest session
  const initialGuest: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "science"],
          content_types: ["text", "image"],
        },
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(initialGuest);

  // 2. Capture baseline session state
  const initialSession = initialGuest.guest_session;
  const initialSessionCount = initialGuest.session_count;
  const initialLastActivity = initialGuest.last_activity;
  const initialBrowseDuration = initialSession.browse_duration;

  // 3. Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 4. Refresh guest session
  const refreshedGuest: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://example.com/guest/dashboard",
        referrer: "https://example.com/guest/welcome",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    });
  typia.assert(refreshedGuest);

  // 5. Validate session state updates
  const refreshedSession = refreshedGuest.guest_session;
  const refreshedLastActivity = refreshedGuest.last_activity;
  const refreshedSessionCount = refreshedGuest.session_count;
  const refreshedBrowseDuration = refreshedSession.browse_duration;

  // 6. Verify session integrity and state updates
  TestValidator.equals(
    "guest user ID should remain consistent",
    refreshedGuest.id,
    initialGuest.id,
  );

  TestValidator.equals(
    "session count should be incremented",
    refreshedSessionCount,
    initialSessionCount + 1,
  );

  TestValidator.predicate(
    "last activity timestamp should be updated",
    new Date(refreshedLastActivity).getTime() >
      new Date(initialLastActivity).getTime(),
  );

  TestValidator.predicate(
    "browse duration should be updated",
    refreshedBrowseDuration >= 300,
  );

  TestValidator.equals(
    "capabilities should be preserved",
    refreshedSession.capabilities,
    initialSession.capabilities,
  );

  TestValidator.equals(
    "session state should be valid",
    refreshedSession.session_state,
    initialSession.session_state,
  );

  TestValidator.predicate(
    "session state should be active",
    refreshedSession.session_state === "active",
  );

  TestValidator.equals(
    "browsing preferences should be preserved",
    refreshedGuest.browsing_preferences?.interests,
    initialGuest.browsing_preferences?.interests,
  );
}
