import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test community moderator account registration workflow enabling users with
 * community management responsibilities to create accounts and receive
 * immediate authentication credentials.
 *
 * This comprehensive test verifies successful community moderator registration
 * with all required identity credentials:
 *
 * - Valid email address for authentication and communications
 * - Secure password for account protection
 * - Unique nickname for platform identification
 * - Connection metadata (current page URL, referrer URL) for session tracking and
 *   security auditing
 *
 * Validates that community moderators receive full authentication credentials
 * upon registration:
 *
 * - JWT access and refresh tokens for API authentication
 * - System-generated account ID for unique identification
 * - Creation timestamps for audit tracking
 * - Appropriate error handling for duplicate email or nickname registrations
 *
 * Ensures moderator accounts are properly established in the authentication
 * framework for subsequent community assignment and permission management.
 *
 * Expected outcomes:
 *
 * - Successful registration returns complete moderator profile with
 *   authentication tokens
 * - New accounts include proper role attribution for moderation privileges
 * - Registration attempts with duplicate credentials are rejected with
 *   appropriate validation messages
 * - Connection metadata is captured for security auditing
 */
export async function test_api_community_moderator_registration(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration data for community moderator
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const nickname = RandomGenerator.name();
  const href = "https://reddit-community.example.com/register";
  const referrer = "https://reddit-community.example.com/login";
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // Step 2: Create registration request body with all required fields
  const registrationData = {
    email,
    password,
    nickname,
    href,
    referrer,
    ip,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  // Step 3: Perform community moderator registration
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: registrationData,
    },
  );

  // Step 4: Validate response structure and authentication tokens
  typia.assert(moderator);

  // Step 5: Verify core identity information
  TestValidator.equals("moderator email matches input", moderator.email, email);
  TestValidator.equals(
    "moderator nickname matches input",
    moderator.nickname,
    nickname,
  );
  TestValidator.predicate("moderator has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(moderator.id),
  );
  TestValidator.predicate("moderator has creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(moderator.created_at),
  );
  TestValidator.predicate("moderator has update timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(moderator.updated_at),
  );

  // Step 6: Validate authentication token structure
  typia.assert(moderator.token);
  TestValidator.predicate(
    "access token is non-empty string",
    () =>
      typeof moderator.token.access === "string" &&
      moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    () =>
      typeof moderator.token.refresh === "string" &&
      moderator.token.refresh.length > 0,
  );
  TestValidator.predicate("token has expiration timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(moderator.token.expired_at),
  );
  TestValidator.predicate("token has refreshable timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(
      moderator.token.refreshable_until,
    ),
  );

  // Step 7: Test duplicate email registration rejection
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          email, // Same email as before
          password: RandomGenerator.alphaNumeric(12),
          nickname: RandomGenerator.name(),
          href,
          referrer,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      });
    },
  );

  // Step 8: Test duplicate nickname registration rejection
  await TestValidator.error(
    "duplicate nickname registration should fail",
    async () => {
      await api.functional.auth.communityModerator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          nickname, // Same nickname as before
          href,
          referrer,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      });
    },
  );

  // Step 9: Test registration with optional IP field as null
  const moderatorNullIp = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/register",
        referrer: "https://reddit-community.example.com/join",
        ip: null,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  typia.assert(moderatorNullIp);
  TestValidator.predicate(
    "moderator with null IP has valid structure",
    () =>
      typeof moderatorNullIp.id === "string" && moderatorNullIp.id.length > 0,
  );

  // Step 10: Test registration with optional IP field as undefined
  const moderatorUndefinedIp =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.example.com/register",
        referrer: "https://reddit-community.example.com/join",
        // ip field omitted (undefined)
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });

  typia.assert(moderatorUndefinedIp);
  TestValidator.predicate(
    "moderator with undefined IP has valid structure",
    () =>
      typeof moderatorUndefinedIp.id === "string" &&
      moderatorUndefinedIp.id.length > 0,
  );

  // Step 11: Test successful registration with different valid data
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(12);
  const nickname2 = RandomGenerator.name();

  const moderator2 = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: email2,
        password: password2,
        nickname: nickname2,
        href: "https://reddit-community.example.com/register",
        referrer: "https://reddit-community.example.com/join",
        ip: typia.random<string & tags.Format<"ipv6">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );

  // Step 12: Validate second moderator registration
  typia.assert(moderator2);
  TestValidator.equals(
    "second moderator email matches input",
    moderator2.email,
    email2,
  );
  TestValidator.equals(
    "second moderator nickname matches input",
    moderator2.nickname,
    nickname2,
  );
  TestValidator.predicate(
    "second moderator has different ID",
    () => moderator2.id !== moderator.id,
  );
  TestValidator.predicate(
    "second moderator has valid tokens",
    () =>
      typeof moderator2.token.access === "string" &&
      moderator2.token.access.length > 0 &&
      typeof moderator2.token.refresh === "string" &&
      moderator2.token.refresh.length > 0,
  );
}
