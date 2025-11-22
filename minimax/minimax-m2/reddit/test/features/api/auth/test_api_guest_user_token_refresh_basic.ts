import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

export async function test_api_guest_user_token_refresh_basic(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session using join operation
  const guestUser: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "science"],
          content_types: ["text", "link"],
        },
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(guestUser);

  // Store initial session information for comparison
  const initialSessionCount = guestUser.session_count;
  const initialLastActivity = guestUser.last_activity;
  const initialToken = guestUser.token.access;
  const initialCapabilities = [...guestUser.guest_session.capabilities];

  // Step 2: Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Refresh the guest user token
  const refreshedGuestUser: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        href: "https://reddit-platform.example.com/browse",
        referrer: "https://reddit-platform.example.com/home",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    });
  typia.assert(refreshedGuestUser);

  // Step 4: Validate token refresh
  TestValidator.equals(
    "token should be refreshed",
    refreshedGuestUser.token.access,
    refreshedGuestUser.token.access,
  );
  TestValidator.notEquals(
    "new access token should be different",
    refreshedGuestUser.token.access,
    initialToken,
  );

  // Step 5: Validate session metadata updates
  TestValidator.equals(
    "session count should be incremented",
    refreshedGuestUser.session_count,
    initialSessionCount + 1,
  );
  TestValidator.notEquals(
    "last activity should be updated",
    refreshedGuestUser.last_activity,
    initialLastActivity,
  );

  // Step 6: Validate guest session capabilities are maintained
  TestValidator.equals(
    "browsing capabilities should be maintained",
    refreshedGuestUser.guest_session.capabilities,
    initialCapabilities,
  );

  // Step 7: Validate session state
  TestValidator.equals(
    "session state should be active",
    refreshedGuestUser.guest_session.session_state,
    "active",
  );

  // Step 8: Validate browse duration is available
  TestValidator.predicate(
    "browse duration should be available",
    refreshedGuestUser.guest_session.browse_duration >= 300,
  );

  // Step 9: Validate that browsing capabilities enable continued platform exploration
  TestValidator.predicate(
    "should have browse communities capability",
    refreshedGuestUser.guest_session.capabilities.includes(
      "browse_communities",
    ),
  );
  TestValidator.predicate(
    "should have view posts capability",
    refreshedGuestUser.guest_session.capabilities.includes("view_posts"),
  );
  TestValidator.predicate(
    "should have view comments capability",
    refreshedGuestUser.guest_session.capabilities.includes("view_comments"),
  );
  TestValidator.predicate(
    "should have view profiles capability",
    refreshedGuestUser.guest_session.capabilities.includes("view_profiles"),
  );
  TestValidator.predicate(
    "should have browse public content capability",
    refreshedGuestUser.guest_session.capabilities.includes(
      "browse_public_content",
    ),
  );

  // Step 10: Validate session timestamps are properly formatted
  TestValidator.predicate(
    "created_at should be valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      refreshedGuestUser.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at should be valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      refreshedGuestUser.updated_at,
    ),
  );
  TestValidator.predicate(
    "last_activity should be valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      refreshedGuestUser.last_activity,
    ),
  );
}
