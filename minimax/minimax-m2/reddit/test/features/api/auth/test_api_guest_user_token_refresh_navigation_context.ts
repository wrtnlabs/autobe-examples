import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IGuestSessionInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuestSessionInfo";
import type { IRedditPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestUser";

export async function test_api_guest_user_token_refresh_navigation_context(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session with browsing preferences
  const guestSession: IRedditPlatformGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        browsing_preferences: {
          interests: ["technology", "gaming"],
          content_types: ["text", "link", "image"],
          session_metadata: {
            session_id: typia.random<string & tags.Format<"uuid">>(),
            preferred_communities: ["r/technology", "r/gaming"],
            engagement_level: "medium",
          },
        },
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformGuestUser.ICreate,
    });
  typia.assert(guestSession);

  // Validate initial session creation
  TestValidator.equals(
    "guest session ID exists",
    guestSession.id,
    guestSession.id,
  );
  TestValidator.equals(
    "token access exists",
    guestSession.token.access,
    guestSession.token.access,
  );
  TestValidator.equals(
    "guest session capabilities include browsing",
    guestSession.guest_session.capabilities.includes("browse_communities"),
    true,
  );
  TestValidator.equals(
    "browse duration is valid",
    guestSession.guest_session.browse_duration >= 300,
    true,
  );

  // Step 2: Test Direct Access Navigation Context
  const directAccessRefresh = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://reddit-platform.com/",
        referrer: "",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(directAccessRefresh);

  // Validate direct access refresh maintains session
  TestValidator.equals(
    "direct access refresh maintains same session",
    directAccessRefresh.id,
    guestSession.id,
  );
  TestValidator.equals(
    "direct access refresh generates new token",
    directAccessRefresh.token.access !== guestSession.token.access,
    true,
  );
  TestValidator.equals(
    "session count incremented",
    directAccessRefresh.session_count,
    guestSession.session_count + 1,
  );
  TestValidator.equals(
    "browse duration refreshed",
    directAccessRefresh.guest_session.browse_duration >= 300,
    true,
  );

  // Step 3: Test Community Page Navigation Context
  const communityPageRefresh = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://reddit-platform.com/r/technology",
        referrer: "https://google.com/search?q=latest+technology+trends",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(communityPageRefresh);

  // Validate community page navigation tracking
  TestValidator.equals(
    "community page refresh maintains session",
    communityPageRefresh.id,
    directAccessRefresh.id,
  );
  TestValidator.equals(
    "community page refresh generates new token",
    communityPageRefresh.token.access !== directAccessRefresh.token.access,
    true,
  );
  TestValidator.equals(
    "session count incremented again",
    communityPageRefresh.session_count,
    directAccessRefresh.session_count + 1,
  );
  TestValidator.equals(
    "community count increased",
    (communityPageRefresh.guest_session.community_count ?? 0) >= 1,
    true,
  );

  // Step 4: Test Post View Navigation Context
  const postViewRefresh = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://reddit-platform.com/r/technology/posts/tech-innovation-2024",
        referrer: "https://reddit-platform.com/r/technology",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(postViewRefresh);

  // Validate post view navigation tracking
  TestValidator.equals(
    "post view refresh maintains session",
    postViewRefresh.id,
    communityPageRefresh.id,
  );
  TestValidator.equals(
    "post view refresh generates new token",
    postViewRefresh.token.access !== communityPageRefresh.token.access,
    true,
  );
  TestValidator.equals(
    "session count incremented again",
    postViewRefresh.session_count,
    communityPageRefresh.session_count + 1,
  );
  TestValidator.equals(
    "post view preserves browsing preferences",
    postViewRefresh.browsing_preferences?.interests?.length ?? 0,
    2,
  );

  // Step 5: Test Cross-Navigation Flow
  const crossNavigationRefresh = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://reddit-platform.com/r/gaming/posts/best-games-2024",
        referrer:
          "https://reddit-platform.com/r/technology/posts/tech-innovation-2024",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(crossNavigationRefresh);

  // Validate cross-navigation flow
  TestValidator.equals(
    "cross-navigation refresh maintains session",
    crossNavigationRefresh.id,
    postViewRefresh.id,
  );
  TestValidator.equals(
    "cross-navigation refresh generates new token",
    crossNavigationRefresh.token.access !== postViewRefresh.token.access,
    true,
  );
  TestValidator.equals(
    "session count incremented",
    crossNavigationRefresh.session_count,
    postViewRefresh.session_count + 1,
  );
  TestValidator.equals(
    "session state remains active",
    crossNavigationRefresh.guest_session.session_state,
    "active",
  );

  // Step 6: Validate Session Continuity and State Preservation
  TestValidator.equals(
    "initial session ID preserved throughout",
    crossNavigationRefresh.id,
    guestSession.id,
  );
  TestValidator.equals(
    "token access regenerated on each refresh",
    [
      guestSession.token.access,
      directAccessRefresh.token.access,
      communityPageRefresh.token.access,
      postViewRefresh.token.access,
      crossNavigationRefresh.token.access,
    ].filter((token, index, arr) => arr.indexOf(token) === index).length,
    5,
  );
  TestValidator.equals(
    "browse duration consistently valid",
    crossNavigationRefresh.guest_session.browse_duration >= 300,
    true,
  );
  TestValidator.equals(
    "session metadata preserved",
    crossNavigationRefresh.browsing_preferences?.interests?.includes(
      "technology",
    ),
    true,
  );
  TestValidator.equals(
    "last activity updated",
    crossNavigationRefresh.last_activity !== guestSession.last_activity,
    true,
  );

  // Step 7: Test Edge Case - External to Internal Navigation
  const externalToInternalRefresh = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        href: "https://reddit-platform.com/",
        referrer: "https://external-site.com/article",
      } satisfies IRedditPlatformGuestUser.IRefresh,
    },
  );
  typia.assert(externalToInternalRefresh);

  TestValidator.equals(
    "external referrer handled correctly",
    externalToInternalRefresh.id,
    crossNavigationRefresh.id,
  );
  TestValidator.equals(
    "external navigation generates new token",
    externalToInternalRefresh.token.access !==
      crossNavigationRefresh.token.access,
    true,
  );

  // Final validation - ensure all navigation contexts work seamlessly
  TestValidator.equals(
    "final session state is active",
    externalToInternalRefresh.guest_session.session_state,
    "active",
  );
  TestValidator.equals(
    "total session count accurate",
    externalToInternalRefresh.session_count,
    6,
  ); // 1 initial + 5 refreshes
  TestValidator.equals(
    "token refresh chain complete",
    externalToInternalRefresh.token.expired_at !==
      guestSession.token.expired_at,
    true,
  );
}
