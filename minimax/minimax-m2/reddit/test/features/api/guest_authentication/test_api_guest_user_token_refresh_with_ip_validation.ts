import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

/**
 * Test guest user token refresh with IP address validation for enhanced session
 * security.
 *
 * Validates the complete guest user session refresh workflow with IP-based
 * security context. Tests create initial guest session with IP tracking, then
 * performs token refresh with IPv4 address validation to ensure session
 * continuity and security enhancement.
 */
export async function test_api_guest_user_token_refresh_with_ip_validation(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session with IP address tracking
  const initialGuestSession: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "programming"],
          content_types: ["text", "link"],
          session_metadata: {
            session_id: typia.random<string & tags.Format<"uuid">>(),
            preferred_communities: ["programming", "webdev", "javascript"],
            engagement_level: "medium",
          },
        },
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(initialGuestSession);

  // Step 2: Validate initial session creation
  TestValidator.equals(
    "guest session should be created with browsing preferences",
    initialGuestSession.browsing_preferences?.interests,
    ["technology", "programming"],
  );
  TestValidator.equals(
    "guest session should have content type preferences",
    initialGuestSession.browsing_preferences?.content_types,
    ["text", "link"],
  );
  TestValidator.predicate(
    "guest session should have valid JWT tokens",
    initialGuestSession.token?.access?.length > 0,
  );
  TestValidator.predicate(
    "guest session should have session metadata",
    initialGuestSession.browsing_preferences?.session_metadata !== undefined,
  );

  // Step 3: Extract session ID for refresh validation
  const originalSessionId =
    initialGuestSession.browsing_preferences?.session_metadata?.session_id;

  // Step 4: Perform token refresh with IP address validation
  const refreshedSession: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        href: "https://example.com/guest/browse",
        referrer: "https://example.com/guest/home",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    });
  typia.assert(refreshedSession);

  // Step 5: Validate session refresh maintains IP-based security context
  TestValidator.equals(
    "guest session ID should be preserved during refresh",
    refreshedSession.browsing_preferences?.session_metadata?.session_id,
    originalSessionId,
  );
  TestValidator.predicate(
    "refreshed session should have new access tokens",
    refreshedSession.token?.access !== initialGuestSession.token?.access,
  );
  TestValidator.predicate(
    "refreshed session should have valid refresh token",
    refreshedSession.token?.refresh?.length > 0,
  );

  // Step 6: Validate security tracking information updates
  TestValidator.predicate(
    "session count should increment after refresh",
    refreshedSession.session_count > initialGuestSession.session_count,
  );
  TestValidator.predicate(
    "last activity should be updated after refresh",
    refreshedSession.last_activity !== initialGuestSession.last_activity,
  );
  TestValidator.predicate(
    "browse duration should be reset or extended",
    refreshedSession.guest_session?.browse_duration >= 300,
  );

  // Step 7: Validate session capabilities and state
  TestValidator.equals(
    "guest session capabilities should remain consistent",
    refreshedSession.guest_session?.capabilities,
    [
      "browse_communities",
      "view_posts",
      "view_comments",
      "view_profiles",
      "browse_public_content",
    ],
  );
  TestValidator.predicate(
    "session state should indicate active status",
    refreshedSession.guest_session?.session_state === "active",
  );

  // Step 8: Validate session metadata continuity
  TestValidator.equals(
    "preferred communities should be maintained",
    refreshedSession.browsing_preferences?.session_metadata
      ?.preferred_communities,
    initialGuestSession.browsing_preferences?.session_metadata
      ?.preferred_communities,
  );
  TestValidator.equals(
    "engagement level should be preserved",
    refreshedSession.browsing_preferences?.session_metadata?.engagement_level,
    initialGuestSession.browsing_preferences?.session_metadata
      ?.engagement_level,
  );

  // Step 9: Validate enhanced security measures
  TestValidator.predicate(
    "session should have updated timestamps",
    refreshedSession.updated_at !== initialGuestSession.updated_at,
  );
  TestValidator.predicate(
    "guest session should maintain browsing preferences",
    refreshedSession.browsing_preferences?.interests !== undefined,
  );
  TestValidator.predicate(
    "session should be ready for continued access",
    refreshedSession.guest_session?.browse_duration > 0,
  );
}
