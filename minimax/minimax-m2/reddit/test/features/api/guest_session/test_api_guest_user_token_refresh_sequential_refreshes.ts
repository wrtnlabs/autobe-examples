import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

export async function test_api_guest_user_token_refresh_sequential_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session with browse preferences
  const guestSession: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "programming", "software development"],
          content_types: ["text", "link", "image"],
          session_metadata: {
            session_id: typia.random<string & tags.Format<"uuid">>(),
            preferred_communities: ["javascript", "typescript", "backend"],
            engagement_level: "medium",
          },
        },
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(guestSession);

  // Store initial session data for comparison
  const initialSessionId = guestSession.id;
  const initialSessionCount = guestSession.session_count;
  const initialActivity = guestSession.last_activity;
  const initialToken = guestSession.token.access;

  TestValidator.equals(
    "initial session created successfully",
    initialSessionId.length > 0,
    true,
  );
  TestValidator.predicate(
    "initial session count is valid",
    initialSessionCount >= 1,
  );

  // Step 2: Execute multiple sequential refresh requests with different contexts
  const refreshCount = 4; // Test with 4 sequential refreshes
  const refreshContexts = [
    {
      href: "https://reddit-platform.com/home",
      referrer: "https://google.com/search?q=programming",
    },
    {
      href: "https://reddit-platform.com/r/javascript",
      referrer: "https://reddit-platform.com/home",
    },
    {
      href: "https://reddit-platform.com/r/typescript/posts",
      referrer: "https://reddit-platform.com/r/javascript",
    },
    {
      href: "https://reddit-platform.com/trending",
      referrer: "https://reddit-platform.com/r/typescript/posts",
    },
  ];

  let currentSession = guestSession; // Track current session state without mutation

  for (let i = 0; i < refreshCount; i++) {
    const context = refreshContexts[i];
    const refreshRequest: IRedditPlatformGuestUser.IRefresh = {
      href: context.href,
      referrer: context.referrer,
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
    };

    // Perform refresh request
    const refreshedSession: IRedditPlatformGuestUser.IAuthorized =
      await api.functional.auth.guestUser.refresh(connection, {
        body: refreshRequest,
      });
    typia.assert(refreshedSession);

    // Step 3: Validate session continuity and proper updates
    TestValidator.equals(
      `session ${i + 1}: session ID should remain consistent`,
      refreshedSession.id,
      initialSessionId,
    );

    TestValidator.equals(
      `session ${i + 1}: session count should increment`,
      refreshedSession.session_count,
      initialSessionCount + (i + 1),
    );

    TestValidator.notEquals(
      `session ${i + 1}: access token should be updated`,
      refreshedSession.token.access,
      initialToken,
    );

    TestValidator.equals(
      `session ${i + 1}: refresh token should remain the same`,
      refreshedSession.token.refresh,
      currentSession.token.refresh,
    );

    TestValidator.predicate(
      `session ${i + 1}: activity timestamp should be updated`,
      new Date(refreshedSession.last_activity) > new Date(initialActivity),
    );

    TestValidator.equals(
      `session ${i + 1}: browse capabilities should remain consistent`,
      refreshedSession.guest_session.capabilities,
      currentSession.guest_session.capabilities,
    );

    TestValidator.equals(
      `session ${i + 1}: session state should remain active`,
      refreshedSession.guest_session.session_state,
      "active",
    );

    TestValidator.predicate(
      `session ${i + 1}: browse duration should be maintained`,
      refreshedSession.guest_session.browse_duration >= 300,
    );

    // Validate that browsing preferences and session metadata are preserved
    if (refreshedSession.browsing_preferences?.interests) {
      TestValidator.equals(
        `session ${i + 1}: interests should be preserved`,
        refreshedSession.browsing_preferences.interests,
        currentSession.browsing_preferences?.interests,
      );
    }

    if (refreshedSession.browsing_preferences?.content_types) {
      TestValidator.equals(
        `session ${i + 1}: content types should be preserved`,
        refreshedSession.browsing_preferences.content_types,
        currentSession.browsing_preferences?.content_types,
      );
    }

    // Update current session tracking without mutation
    currentSession = refreshedSession;
  }

  // Step 4: Final validation - ensure all refreshes maintained session integrity
  TestValidator.equals(
    "final session count should be initial + 4",
    currentSession.session_count,
    initialSessionCount + refreshCount,
  );
  TestValidator.predicate(
    "final session should have recent activity",
    new Date(currentSession.last_activity) >
      new Date(new Date().getTime() - 60000),
  );

  // Verify that all refresh operations maintained consistent access
  TestValidator.equals(
    "browse capabilities should remain available throughout refresh sequence",
    currentSession.guest_session.capabilities.length > 0,
    true,
  );
}
