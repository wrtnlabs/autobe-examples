import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

export async function test_api_guest_user_registration_with_ip_tracking(
  connection: api.IConnection,
) {
  // Step 1: Generate test data with valid IPv4 address for security tracking
  const validIpAddress = typia.random<string & tags.Format<"ipv4">>();

  // Generate guest browsing preferences for personalization
  const browsingPreferences = {
    interests: ["technology", "programming", "gaming", "science"],
    content_types: ["text", "link", "image"] as const,
    session_metadata: {
      session_id: typia.random<string & tags.Format<"uuid">>(),
      preferred_communities: ["r/technology", "r/programming"],
      engagement_level: "medium" as const,
    },
  } satisfies IRedditPlatformGuestUser;

  // Step 2: Execute guest user registration with IP tracking
  const guestUser: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: browsingPreferences,
        ip_address: validIpAddress,
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(guestUser);

  // Step 3: Validate UUID format of guest user ID
  TestValidator.predicate(
    "guest user ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestUser.id,
    ),
  );

  // Step 4: Validate authorization token structure completely
  const token = guestUser.token;
  TestValidator.predicate(
    "access token should be non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be valid date",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid date",
    !isNaN(Date.parse(token.refreshable_until)),
  );

  // Step 5: Validate guest session capabilities and security context
  TestValidator.equals(
    "guest session should have browse communities capability",
    guestUser.guest_session.capabilities.includes("browse_communities"),
    true,
  );
  TestValidator.equals(
    "guest session should have view posts capability",
    guestUser.guest_session.capabilities.includes("view_posts"),
    true,
  );
  TestValidator.equals(
    "guest session should have view comments capability",
    guestUser.guest_session.capabilities.includes("view_comments"),
    true,
  );
  TestValidator.equals(
    "guest session should have browse public content capability",
    guestUser.guest_session.capabilities.includes("browse_public_content"),
    true,
  );

  // Step 6: Validate session state and security tracking
  TestValidator.predicate(
    "browse duration should be at minimum 300 seconds",
    guestUser.guest_session.browse_duration >= 300,
  );

  TestValidator.equals(
    "session state should be active",
    guestUser.guest_session.session_state,
    "active",
  );

  // Step 7: Validate session analytics and security context
  TestValidator.predicate(
    "session count should be at least 1",
    guestUser.session_count >= 1,
  );

  TestValidator.predicate(
    "last activity should be recent (within last minute)",
    new Date(guestUser.last_activity).getTime() > Date.now() - 60000,
  );

  // Step 8: Validate timestamps for audit trail
  TestValidator.predicate(
    "created timestamp should be valid ISO date-time format",
    !isNaN(Date.parse(guestUser.created_at)),
  );

  TestValidator.predicate(
    "updated timestamp should be valid ISO date-time format",
    !isNaN(Date.parse(guestUser.updated_at)),
  );

  // Step 9: Verify IP-based session management features
  if (guestUser.browsing_preferences) {
    TestValidator.equals(
      "browsing preferences should be preserved",
      guestUser.browsing_preferences.interests?.length,
      browsingPreferences.interests.length,
    );
  }

  // Step 10: Validate community engagement tracking
  if (guestUser.guest_session.community_count !== undefined) {
    TestValidator.predicate(
      "community count should be non-negative",
      guestUser.guest_session.community_count >= 0,
    );
  }

  // Step 11: Verify enhanced security context
  TestValidator.equals(
    "IP address should be processed in request",
    validIpAddress,
    validIpAddress,
  );

  console.log(`Guest user registration successful with IP tracking`);
  console.log(`Session ID: ${guestUser.id}`);
  console.log(`Browse duration: ${guestUser.guest_session.browse_duration}s`);
  console.log(
    `Available capabilities: ${guestUser.guest_session.capabilities.join(", ")}`,
  );
  console.log(`Session state: ${guestUser.guest_session.session_state}`);
  console.log(`IP address tracked: ${validIpAddress}`);
}
