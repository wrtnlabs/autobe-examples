import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test retrieving a member profile with bio and avatar customization.
 *
 * This test validates that optional profile customization fields (bio and
 * avatar_url) are correctly stored during registration and returned when
 * retrieving the public profile.
 *
 * Steps:
 *
 * 1. Create a member account with bio and avatar_url populated
 * 2. Retrieve the member's public profile by username
 * 3. Verify bio and avatar_url are present and match the registration data
 */
export async function test_api_member_profile_with_bio_and_avatar(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with bio and avatar_url
  const testBio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const testAvatarUrl = typia.random<string & tags.Format<"uri">>();
  const testUsername = RandomGenerator.alphaNumeric(12);
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(10);

  const registrationData = {
    username: testUsername,
    email: testEmail,
    password: testPassword,
    display_name: RandomGenerator.name(2),
    bio: testBio,
    avatar_url: testAvatarUrl,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedMember);

  // Step 2: Retrieve the member's public profile by username
  const publicProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.members.at(connection, {
      username: testUsername,
    });

  typia.assert(publicProfile);

  // Step 3: Verify bio and avatar_url are present and match
  TestValidator.equals(
    "bio matches registration data",
    publicProfile.bio,
    testBio,
  );
  TestValidator.equals(
    "avatar_url matches registration data",
    publicProfile.avatar_url,
    testAvatarUrl,
  );
  TestValidator.equals(
    "username matches",
    publicProfile.username,
    testUsername,
  );
  TestValidator.equals(
    "member ID matches",
    publicProfile.id,
    authorizedMember.id,
  );
}
