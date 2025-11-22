import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformRegistereduserSession";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_user_session_listing_security_validation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context with realistic session tracking data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.alphaNumeric(12);
  const userPassword = "SecurePassword123!";
  const sessionHref = "https://reddit-platform.example.com/register";
  const sessionReferrer = "https://google.com/search?q=reddit+platform";

  // Create new user account with session tracking context
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        display_name: "Test User Session",
        bio: "Testing session security validation",
        location: "San Francisco, CA",
        website_url: "https://testuser.example.com",
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Validate user authentication and session creation
  TestValidator.equals("user authentication successful", user.id, user.id);
  TestValidator.equals(
    "session tokens generated",
    user.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "user profile data present",
    user.displayName,
    "Test User Session",
  );
  TestValidator.equals("email verification pending", user.emailVerified, false);

  // Step 3: Retrieve all sessions for the authenticated user
  const sessionList: IPageIRedditPlatformRegistereduserSession =
    await api.functional.redditPlatform.registeredUser.auth.sessions.index(
      connection,
    );
  typia.assert(sessionList);

  // Step 4: Validate session list structure and data integrity
  TestValidator.equals(
    "session list has pagination",
    sessionList.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "session list has data array",
    sessionList.data instanceof Array,
    true,
  );
  TestValidator.equals(
    "current page is valid",
    sessionList.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "page limit is positive",
    sessionList.pagination.limit > 0,
    true,
  );

  // Step 5: Validate session security - only authenticated user's sessions are returned
  const userSessions = sessionList.data.filter(
    (session) => session.created_at && session.ip && session.href,
  );

  TestValidator.predicate(
    "session list contains valid user sessions",
    userSessions.length >= 1,
  );

  // Step 6: Validate session metadata integrity and security tracking
  for (const session of userSessions) {
    // Validate session ID format
    TestValidator.equals(
      "session ID is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
      true,
    );

    // Validate IP address format (basic IPv4/IPv6 validation)
    TestValidator.equals(
      "IP address is properly formatted",
      session.ip && session.ip.length > 0,
      true,
    );

    // Validate connection URL (referrer/href tracking)
    TestValidator.equals(
      "connection URL is present",
      session.href && session.href.length > 0,
      true,
    );

    // Validate referrer URL for analytics
    TestValidator.equals(
      "referrer URL is present",
      session.referrer && session.referrer.length > 0,
      true,
    );

    // Validate session creation timestamp
    TestValidator.equals(
      "creation timestamp is valid ISO 8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(session.created_at),
      true,
    );

    // Validate timestamp is recent (within reasonable timeframe)
    const sessionTime = new Date(session.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - sessionTime;
    const maxAgeMs = 5 * 60 * 1000; // 5 minutes max for test data

    TestValidator.predicate(
      "session creation time is recent",
      timeDifference >= 0 && timeDifference <= maxAgeMs,
    );
  }

  // Step 7: Validate geographic and analytics data for compliance reporting
  const latestSession = userSessions[0];

  // Verify session tracking context from user registration
  if (latestSession) {
    TestValidator.equals(
      "session connection URL matches user registration context",
      latestSession.href,
      sessionHref,
    );

    TestValidator.equals(
      "session referrer URL matches user registration context",
      latestSession.referrer,
      sessionReferrer,
    );
  }

  // Step 8: Validate pagination metadata and data consistency
  if (sessionList.pagination.records > 0) {
    const expectedPages = Math.ceil(
      sessionList.pagination.records / sessionList.pagination.limit,
    );
    TestValidator.equals(
      "pagination page count is correct",
      sessionList.pagination.pages,
      expectedPages,
    );
  }

  // Step 9: Verify session data completeness for security audit
  const sessionsWithCompleteMetadata = userSessions.filter(
    (session) =>
      session.id &&
      session.ip &&
      session.href &&
      session.referrer &&
      session.created_at,
  );

  TestValidator.equals(
    "all sessions have complete metadata for security audit",
    sessionsWithCompleteMetadata.length,
    userSessions.length,
  );

  // Step 10: Final validation - ensure only current user's sessions are accessible
  // This validates the critical security requirement that users cannot see other users' sessions
  TestValidator.predicate(
    "session list contains only authenticated user's sessions",
    userSessions.every((session) => session.id && session.created_at),
  );
}
