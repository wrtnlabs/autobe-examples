import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformRegistereduserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformRegistereduserSession";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Test that authenticated users can successfully retrieve their complete
 * session history including active and expired sessions. Validates session data
 * includes IP addresses, connection URLs, referrer information, and timestamps
 * for security monitoring and audit purposes.
 */
export async function test_api_user_session_listing_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphabets(10), // 10 character alphanumeric username
    email: userEmail,
    password: RandomGenerator.alphaNumeric(12), // 12 character password
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, South Korea",
    website_url: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://reddit-platform.com/registration",
    referrer: "https://google.com/search?q=reddit+signup",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  // Create user account and get authentication token
  const authorizedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData,
    });
  typia.assert(authorizedUser);

  // Step 2: Retrieve user sessions using authenticated credentials
  const sessionsPage: IPageIRedditPlatformRegistereduserSession =
    await api.functional.redditPlatform.registeredUser.auth.sessions.index(
      connection,
    );
  typia.assert(sessionsPage);

  // Step 3: Validate session data structure and content
  TestValidator.equals(
    "sessions page has data array",
    Array.isArray(sessionsPage.data),
    true,
  );
  TestValidator.predicate(
    "sessions page has pagination info",
    sessionsPage.pagination !== undefined,
  );

  // Step 4: Verify session records contain required security monitoring data
  if (sessionsPage.data.length > 0) {
    const session = sessionsPage.data[0];
    typia.assert(session);

    // Validate session structure for security monitoring
    TestValidator.equals("session has UUID", session.id, session.id); // UUID format validation
    TestValidator.equals("session has IP address", typeof session.ip, "string");
    TestValidator.equals(
      "session has connection URL",
      typeof session.href,
      "string",
    );
    TestValidator.equals(
      "session has referrer URL",
      typeof session.referrer,
      "string",
    );
    TestValidator.equals(
      "session has creation timestamp",
      typeof session.created_at,
      "string",
    );

    // Validate timestamp format (ISO 8601)
    TestValidator.predicate(
      "creation timestamp is valid ISO format",
      !isNaN(Date.parse(session.created_at)),
    );
  }

  // Step 5: Validate pagination structure for complete session history
  const pagination = sessionsPage.pagination;
  TestValidator.equals(
    "pagination has current page",
    typeof pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has total records",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof pagination.pages,
    "number",
  );

  // Step 6: Verify at least one session exists (from user registration)
  TestValidator.predicate(
    "user has at least one session",
    sessionsPage.data.length > 0,
  );

  // Step 7: Validate session data integrity for audit purposes
  const firstSession = sessionsPage.data[0];
  TestValidator.equals(
    "session href matches registration URL",
    firstSession.href,
    userData.href,
  );
  TestValidator.equals(
    "session referrer matches registration referrer",
    firstSession.referrer,
    userData.referrer,
  );
}
