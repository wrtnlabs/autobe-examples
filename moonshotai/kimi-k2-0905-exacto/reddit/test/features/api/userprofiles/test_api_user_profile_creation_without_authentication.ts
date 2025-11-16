import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Validate security measures preventing user profile creation without proper
 * member authentication. Tests that only authenticated members can create
 * profiles and appropriate error responses are returned.
 */
export async function test_api_user_profile_creation_without_authentication(
  connection: api.IConnection,
) {
  // First create an authenticated member to establish the test baseline
  const memberJoinData = {
    nickname: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) + "123!",
  } satisfies IRedditCommunityMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberJoinData,
    },
  );
  typia.assert(authenticatedMember);

  // Create profile data for testing
  const profileData = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(1),
    avatar_url: "https://example.com/avatar.jpg",
    profile_banner_url: "https://example.com/banner.jpg",
    website_url: "https://myprofile.example.com",
    href: "https://reddit-community.example.com/register",
    referrer: "https://reddit-community.example.com",
    ip: "192.168.1.1",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  // Test that authenticated request succeeds (baseline)
  const authenticatedProfile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileData,
      },
    );
  typia.assert(authenticatedProfile);

  // Validate the created profile matches the submitted data
  TestValidator.equals(
    "authenticated display name matches",
    authenticatedProfile.display_name,
    profileData.display_name,
  );
  TestValidator.equals(
    "authenticated bio matches",
    authenticatedProfile.bio,
    profileData.bio,
  );
  TestValidator.equals(
    "authenticated location matches",
    authenticatedProfile.location,
    profileData.location,
  );

  // Verify relationship between authenticated member and profile
  TestValidator.equals(
    "profile member ID matches authenticated member",
    authenticatedProfile.member.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "profile member nickname matches authenticated member",
    authenticatedProfile.member.nickname,
    authenticatedMember.nickname,
  );

  // Create completely new connection without authentication to test unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  // Test that unauthenticated request fails with appropriate error
  await TestValidator.error(
    "unauthenticated profile creation should fail",
    async () => {
      await api.functional.redditCommunity.member.userProfiles.create(
        unauthenticatedConnection,
        {
          body: profileData,
        },
      );
    },
  );

  // Verify that different user data with same connection fails
  const differentProfileData = {
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.name(1),
    avatar_url: "https://example.com/avatar2.jpg",
    profile_banner_url: "https://example.com/banner2.jpg",
    website_url: "https://anotherprofile.example.com",
    href: "https://reddit-community.example.com/register",
    referrer: "https://reddit-community.example.com",
    ip: "192.168.1.2",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  await TestValidator.error(
    "different unauthenticated profile creation should also fail",
    async () => {
      await api.functional.redditCommunity.member.userProfiles.create(
        unauthenticatedConnection,
        {
          body: differentProfileData,
        },
      );
    },
  );
}
