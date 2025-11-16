import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test member registration with custom privacy settings.
 *
 * This test validates that the member registration API correctly accepts and
 * persists privacy settings during account creation. It verifies that privacy
 * preferences (show_online_status, show_subscribed_communities,
 * show_activity_feed) are properly stored in the reddit_community_members table
 * and returned in the API response.
 *
 * Steps:
 *
 * 1. Generate random registration data with specific privacy settings
 * 2. Call the member registration API with privacy preferences
 * 3. Validate the response contains correct privacy settings
 * 4. Verify all privacy settings match the submitted values
 */
export async function test_api_member_registration_with_privacy_settings(
  connection: api.IConnection,
) {
  // Generate random registration data with specific privacy settings
  const registrationData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: false,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  // Register new member with custom privacy settings
  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the response structure
  typia.assert(registeredMember);

  // Verify privacy settings match the submitted values
  TestValidator.equals(
    "show_online_status should be true",
    registeredMember.show_online_status,
    true,
  );

  TestValidator.equals(
    "show_subscribed_communities should be true",
    registeredMember.show_subscribed_communities,
    true,
  );

  TestValidator.equals(
    "show_activity_feed should be false",
    registeredMember.show_activity_feed,
    false,
  );

  // Verify other registration data was properly stored
  TestValidator.equals(
    "username matches registration data",
    registeredMember.username,
    registrationData.username,
  );

  TestValidator.equals(
    "email matches registration data",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "display_name matches registration data",
    registeredMember.display_name,
    registrationData.display_name,
  );

  // Verify authentication tokens are present
  TestValidator.predicate(
    "access token should be present",
    registeredMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    registeredMember.token.refresh.length > 0,
  );
}
