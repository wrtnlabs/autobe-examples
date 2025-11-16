import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";

/**
 * Test successful guest user registration for the economic discussion board.
 *
 * This test validates the complete guest registration flow:
 *
 * 1. Creates a guest user with valid username and user agent
 * 2. Verifies successful session creation with proper authentication
 * 3. Validates response contains complete guest profile data
 * 4. Checks initial activity counters are set to zero
 * 5. Ensures proper token generation for session management
 *
 * The test focuses on establishing anonymous browsing sessions while
 * maintaining session integrity for content access and download tracking.
 */
export async function test_api_guest_join_successful_registration(
  connection: api.IConnection,
) {
  // Generate random guest username
  const username = RandomGenerator.name();

  // Generate realistic user agent string
  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${typia.random<string>()} Safari/537.36`;

  // Create guest registration request
  const guestData = {
    username,
    user_agent: userAgent,
  } satisfies IEconomicDiscussionGuest.ICreate;

  // Register new guest user
  const guestAuth: IEconomicDiscussionGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestData,
    });

  // Validate response structure and data
  typia.assert(guestAuth);

  // Verify guest profile data
  TestValidator.equals(
    "guest username matches input",
    guestAuth.username,
    username,
  );
  TestValidator.equals(
    "articles viewed count is zero",
    guestAuth.articles_viewed_count,
    0,
  );
  TestValidator.equals("downloads count is zero", guestAuth.downloads_count, 0);

  // Validate authorization token structure
  typia.assert(guestAuth.token);
  TestValidator.predicate(
    "access token exists",
    guestAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    guestAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is future date",
    new Date(guestAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh expiration is future date",
    new Date(guestAuth.token.refreshable_until) > new Date(),
  );

  // Verify session timestamps are logical
  TestValidator.predicate(
    "created_at is not in future",
    new Date(guestAuth.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "last_activity_at matches or follows created_at",
    new Date(guestAuth.last_activity_at) >= new Date(guestAuth.created_at),
  );

  // Validate connection headers were updated with authorization
  TestValidator.predicate(
    "connection has authorization header",
    connection.headers !== undefined && "Authorization" in connection.headers,
  );
  TestValidator.equals(
    "connection authorization matches guest token",
    connection.headers?.Authorization,
    guestAuth.token.access,
  );
}
