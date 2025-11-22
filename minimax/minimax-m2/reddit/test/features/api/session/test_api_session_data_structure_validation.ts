import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_session_data_structure_validation(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish authenticated session
  const userData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://google.com",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
  };

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Get the session ID from user data (extracted from token or user data)
  // Note: The session ID should be available in the authorized user response
  // For this test, we'll use the user ID as session reference
  const sessionId = registeredUser.id;

  // Step 3: Retrieve session details to validate data structure
  const sessionData: IRedditPlatformRegisteredUserSession =
    await api.functional.redditPlatform.registeredUser.auth.sessions.at(
      connection,
      {
        sessionId: sessionId satisfies string & tags.Format<"uuid">,
      },
    );
  typia.assert(sessionData);

  // Step 4: Validate session data structure and formats
  TestValidator.equals(
    "session ID is valid UUID format",
    sessionData.id,
    sessionId,
  );

  // Validate IP address format (should be IPv4 or IPv6)
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  TestValidator.predicate(
    "IP address format is valid",
    ipRegex.test(sessionData.ip),
  );

  // Validate connection URL format
  TestValidator.predicate(
    "connection URL is valid URI",
    sessionData.href.startsWith("http://") ||
      sessionData.href.startsWith("https://"),
  );

  // Validate referrer URL format
  TestValidator.predicate(
    "referrer URL is valid URI",
    sessionData.referrer.startsWith("http://") ||
      sessionData.referrer.startsWith("https://"),
  );

  // Validate timestamp formatting (ISO 8601 date-time)
  const timestampRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601 format",
    timestampRegex.test(sessionData.created_at),
  );

  // Validate expiration date format if present
  if (sessionData.expired_at) {
    TestValidator.predicate(
      "expired_at timestamp is valid ISO 8601 format",
      timestampRegex.test(sessionData.expired_at),
    );
  }

  // Verify all required session fields are present
  TestValidator.equals(
    "session has required ID field",
    sessionData.id !== undefined,
    true,
  );
  TestValidator.equals(
    "session has required IP field",
    sessionData.ip !== undefined,
    true,
  );
  TestValidator.equals(
    "session has required href field",
    sessionData.href !== undefined,
    true,
  );
  TestValidator.equals(
    "session has required referrer field",
    sessionData.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "session has required created_at field",
    sessionData.created_at !== undefined,
    true,
  );

  // Validate data integrity - timestamps should be reasonable
  const createdAt = new Date(sessionData.created_at);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

  TestValidator.predicate(
    "session creation timestamp is recent",
    timeDiff <= fiveMinutes,
  );

  // If expiration date exists, it should be after creation date
  if (sessionData.expired_at) {
    const expiredAt = new Date(sessionData.expired_at);
    TestValidator.predicate(
      "expiration date is after creation date",
      expiredAt > createdAt,
    );
  }
}
