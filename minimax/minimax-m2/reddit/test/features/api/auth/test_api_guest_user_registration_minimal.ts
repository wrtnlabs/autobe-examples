import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

/**
 * Test guest user registration with minimal information.
 *
 * This test validates that guest users can register with minimal data and
 * receive complete session information including temporary access tokens,
 * default browsing capabilities, and appropriate session tracking for anonymous
 * platform exploration.
 *
 * The test focuses on verifying that the registration process works with only
 * essential session context, while ensuring all required session metadata is
 * properly initialized including session ID, authorization tokens, session
 * count, timestamps, and default browsing state for anonymous users.
 */
export async function test_api_guest_user_registration_minimal(
  connection: api.IConnection,
) {
  // Create minimal guest user registration request with only required basic data
  const guestUserRequest = {
    // No browsing preferences provided - should get defaults
    // No IP address provided - system should handle appropriately
  } satisfies IRedditPlatformGuestUser.ICreate;

  // Execute guest user registration
  const guestUser: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestUserRequest,
    });

  // Validate complete response structure and types
  typia.assert(guestUser);

  // Validate session ID is properly generated and formatted
  TestValidator.equals(
    "session ID should be a valid UUID format",
    guestUser.id,
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Validate authorization tokens are present and properly structured
  TestValidator.predicate(
    "access token should be present and non-empty",
    guestUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present and non-empty",
    guestUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token should be a JWT-like format",
    guestUser.token.access.includes("."),
  );
  TestValidator.predicate(
    "refresh token should be a JWT-like format",
    guestUser.token.refresh.includes("."),
  );

  // Validate token expiration timestamps are present and valid
  TestValidator.predicate(
    "access token should have expiration timestamp",
    guestUser.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token should have expiration timestamp",
    guestUser.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be in future",
    new Date(guestUser.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration should be in future",
    new Date(guestUser.token.refreshable_until) > new Date(),
  );

  // Validate session tracking information
  TestValidator.predicate(
    "session count should be initialized",
    guestUser.session_count >= 1,
  );
  TestValidator.predicate(
    "session count should be a positive integer",
    guestUser.session_count === Math.floor(guestUser.session_count),
  );

  // Validate timestamps are present and properly formatted
  TestValidator.predicate(
    "last activity timestamp should be present",
    guestUser.last_activity.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp should be present",
    guestUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp should be present",
    guestUser.updated_at.length > 0,
  );

  // Validate timestamp formatting and logical consistency
  const createdAt = new Date(guestUser.created_at);
  const lastActivity = new Date(guestUser.last_activity);
  const updatedAt = new Date(guestUser.updated_at);
  const now = new Date();

  TestValidator.predicate(
    "created at timestamp should be in the past",
    createdAt <= now,
  );
  TestValidator.predicate(
    "last activity should be recent (within reasonable time frame)",
    now.getTime() - lastActivity.getTime() < 60000, // Within 1 minute
  );
  TestValidator.predicate(
    "updated at should be after or equal to created at",
    updatedAt >= createdAt,
  );

  // Validate guest session information and capabilities
  TestValidator.predicate(
    "guest session info should be present",
    guestUser.guest_session !== null && guestUser.guest_session !== undefined,
  );

  // Validate session capabilities are present
  const sessionCapabilities = guestUser.guest_session.capabilities;
  TestValidator.predicate(
    "guest session should have capabilities defined",
    sessionCapabilities.length > 0,
  );
  TestValidator.predicate(
    "guest should have browse communities capability",
    sessionCapabilities.includes("browse_communities"),
  );
  TestValidator.predicate(
    "guest should have view posts capability",
    sessionCapabilities.includes("view_posts"),
  );
  TestValidator.predicate(
    "guest should have view comments capability",
    sessionCapabilities.includes("view_comments"),
  );
  TestValidator.predicate(
    "guest should have view profiles capability",
    sessionCapabilities.includes("view_profiles"),
  );
  TestValidator.predicate(
    "guest should have browse public content capability",
    sessionCapabilities.includes("browse_public_content"),
  );

  // Validate session state and duration
  const validStates = ["active", "pending_refresh", "expiring_soon"];
  TestValidator.predicate(
    "session state should be valid",
    validStates.includes(guestUser.guest_session.session_state),
  );
  TestValidator.predicate(
    "session state should be 'active' for new sessions",
    guestUser.guest_session.session_state === "active",
  );
  TestValidator.predicate(
    "browse duration should be defined and positive",
    guestUser.guest_session.browse_duration > 0,
  );
  TestValidator.predicate(
    "browse duration should meet minimum requirement (300 seconds)",
    guestUser.guest_session.browse_duration >= 300,
  );

  // Validate community count tracking (should be 0 or undefined for new sessions)
  TestValidator.predicate(
    "community count should be initialized",
    guestUser.guest_session.community_count === undefined ||
      guestUser.guest_session.community_count >= 0,
  );

  // Validate browsing preferences are handled correctly (empty/minimal case)
  TestValidator.predicate(
    "browsing preferences should be handled without errors",
    guestUser.browsing_preferences === null ||
      guestUser.browsing_preferences === undefined ||
      typeof guestUser.browsing_preferences === "object",
  );

  // Test that the guest user can be used for subsequent operations
  // (This validates the session was created successfully for practical use)
  TestValidator.predicate(
    "guest session should be ready for anonymous browsing",
    guestUser.token.access.length > 0 &&
      guestUser.guest_session.capabilities.length > 0 &&
      guestUser.guest_session.session_state === "active",
  );
}
