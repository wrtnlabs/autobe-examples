import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test retrieval of a minimal user profile with only required fields.
 *
 * This test validates that the system properly handles profiles without
 * optional fields like bio, location, or avatar URLs, ensuring graceful
 * handling of minimal profile data.
 *
 * 1. Create a new member account to establish authentication context
 * 2. Create a profile with only the required display_name field
 * 3. Retrieve the created profile to verify minimal data handling
 * 4. Validate that optional fields are properly undefined/null
 */
export async function test_api_user_profile_retrieval_minimal_profile(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberData = {
    nickname: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a minimal profile with only required display_name
  const profileData = {
    display_name: RandomGenerator.name(),
    href: "https://example.com/profile",
    ip: "127.0.0.1",
    referrer: "https://example.com/join",
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const createdProfile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileData,
      },
    );
  typia.assert(createdProfile);

  // Step 3: Retrieve the profile by ID to test minimal profile retrieval
  const retrievedProfile =
    await api.functional.redditCommunity.member.userProfiles.at(connection, {
      profileId: createdProfile.id,
    });
  typia.assert(retrievedProfile);

  // Step 4: Validate minimal profile data
  TestValidator.equals(
    "profile ID matches",
    retrievedProfile.id,
    createdProfile.id,
  );
  TestValidator.equals(
    "display name matches",
    retrievedProfile.display_name,
    profileData.display_name,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedProfile.member.id,
    member.id,
  );
  TestValidator.equals(
    "member nickname matches",
    retrievedProfile.member.nickname,
    memberData.nickname,
  );
  TestValidator.equals(
    "member email matches",
    retrievedProfile.member.email,
    memberData.email,
  );
  TestValidator.predicate(
    "profile has creation timestamp",
    !!retrievedProfile.created_at,
  );
  TestValidator.predicate(
    "profile has update timestamp",
    !!retrievedProfile.updated_at,
  );
  TestValidator.equals(
    "verification status is boolean",
    typeof retrievedProfile.is_verified,
    "boolean",
  );

  // Validate that optional fields are undefined for minimal profile
  TestValidator.equals("bio is undefined", retrievedProfile.bio, undefined);
  TestValidator.equals(
    "location is undefined",
    retrievedProfile.location,
    undefined,
  );
  TestValidator.equals(
    "avatar_url is undefined",
    retrievedProfile.avatar_url,
    undefined,
  );
  TestValidator.equals(
    "profile_banner_url is undefined",
    retrievedProfile.profile_banner_url,
    undefined,
  );
  TestValidator.equals(
    "website_url is undefined",
    retrievedProfile.website_url,
    undefined,
  );
}
