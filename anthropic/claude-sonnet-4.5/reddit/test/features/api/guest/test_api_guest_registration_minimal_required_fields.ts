import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test guest registration with only required fields provided.
 *
 * Validates that the Reddit Community platform correctly handles guest account
 * creation when only mandatory fields are supplied, omitting all optional
 * fields.
 *
 * This test ensures:
 *
 * 1. Successful registration with minimal required data
 * 2. Optional fields (display_name, bio, avatar_url) default to null
 * 3. Privacy settings use correct defaults (show_online_status: false,
 *    show_subscribed_communities: false, show_activity_feed: true)
 * 4. Karma scores are initialized to 0
 * 5. JWT authentication tokens are issued correctly
 * 6. Email verification status starts as false for new accounts
 */
export async function test_api_guest_registration_minimal_required_fields(
  connection: api.IConnection,
) {
  // Generate minimal required registration data
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Register new guest account with only required fields
  const guestAccount: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates EVERYTHING including tokens and timestamps
  typia.assert(guestAccount);

  // Verify username matches registration
  TestValidator.equals(
    "username matches registration data",
    guestAccount.username,
    registrationData.username,
  );

  // Verify email matches registration
  TestValidator.equals(
    "email matches registration data",
    guestAccount.email,
    registrationData.email,
  );

  // Verify email is not verified for new account
  TestValidator.equals(
    "email verification is false for new account",
    guestAccount.email_verified,
    false,
  );

  // Verify optional display_name is null
  TestValidator.equals(
    "display_name defaults to null when not provided",
    guestAccount.display_name,
    null,
  );

  // Verify optional bio is null
  TestValidator.equals(
    "bio defaults to null when not provided",
    guestAccount.bio,
    null,
  );

  // Verify optional avatar_url is null
  TestValidator.equals(
    "avatar_url defaults to null when not provided",
    guestAccount.avatar_url,
    null,
  );

  // Verify post karma is initialized to 0
  TestValidator.equals(
    "post_karma initialized to 0",
    guestAccount.post_karma,
    0,
  );

  // Verify comment karma is initialized to 0
  TestValidator.equals(
    "comment_karma initialized to 0",
    guestAccount.comment_karma,
    0,
  );

  // Verify privacy setting: show_online_status defaults to false
  TestValidator.equals(
    "show_online_status defaults to false",
    guestAccount.show_online_status,
    false,
  );

  // Verify privacy setting: show_subscribed_communities defaults to false
  TestValidator.equals(
    "show_subscribed_communities defaults to false",
    guestAccount.show_subscribed_communities,
    false,
  );

  // Verify privacy setting: show_activity_feed defaults to true
  TestValidator.equals(
    "show_activity_feed defaults to true",
    guestAccount.show_activity_feed,
    true,
  );
}
