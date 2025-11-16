import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that the registration response includes properly structured JWT tokens.
 *
 * This test validates the structure and format of authentication tokens
 * returned by the member registration endpoint. It verifies that the response
 * contains a complete IAuthorizationToken object with all required fields
 * (access token, refresh token, expired_at timestamp, and refreshable_until
 * timestamp).
 *
 * The test also validates that timestamps are in ISO 8601 format and that the
 * expired_at timestamp is in the future relative to the registration time,
 * ensuring the tokens are immediately usable after registration.
 *
 * Steps:
 *
 * 1. Generate valid member registration data with required fields
 * 2. Call the member registration endpoint
 * 3. Validate the response structure with typia.assert (validates all type
 *    requirements)
 * 4. Verify business logic: expired_at and refreshable_until are in the future
 */
export async function test_api_member_registration_token_structure(
  connection: api.IConnection,
) {
  // Record the registration time for timestamp validation
  const registrationTime = new Date();

  // Generate valid member registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Call the registration endpoint
  const response: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the response structure with typia - this validates ALL type requirements including:
  // - token object exists and has correct structure
  // - access and refresh tokens are non-empty strings
  // - expired_at and refreshable_until are valid ISO 8601 date-time strings
  typia.assert(response);

  // Validate business logic: expired_at is in the future
  const expiredAt = new Date(response.token.expired_at);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > registrationTime.getTime(),
  );

  // Validate business logic: refreshable_until is in the future
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > registrationTime.getTime(),
  );
}
