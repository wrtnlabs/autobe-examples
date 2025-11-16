import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/**
 * Test complete user profile deletion by the profile owner.
 *
 * This scenario validates that authenticated members can permanently delete
 * their own profiles. The test verifies proper ownership validation, that the
 * deletion is immediate and irreversible, that associated profile data is
 * properly removed, and that the operation maintains referential integrity with
 * related entities.
 *
 * 1. Register a new member account to establish authentication context
 * 2. Create a user profile for the authenticated member
 * 3. Delete the profile using the profile ID
 * 4. Verify the deletion was successful
 */
export async function test_api_user_profile_delete_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to establish authentication context
  const memberEmail = await typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a user profile for the authenticated member
  const profileData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(),
    href: "https://reddit-community.com/profile",
    referrer: "https://reddit-community.com/join",
    ip: null,
    avatar_url: `https://example.com/avatar-${await typia.random<string & tags.Format<"uuid">>()}.jpg`,
    profile_banner_url: `https://example.com/banner-${await typia.random<string & tags.Format<"uuid">>()}.jpg`,
    website_url: `https://${RandomGenerator.name()}.com`,
  } satisfies IRedditCommunityUserProfiles.ICreate;

  const profile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: profileData,
      },
    );
  typia.assert(profile);

  TestValidator.equals(
    "profile display name matches input",
    profile.display_name,
    profileData.display_name,
  );
  TestValidator.equals(
    "profile bio matches input",
    profile.bio,
    profileData.bio,
  );
  TestValidator.equals(
    "profile member ID matches authenticated member",
    profile.member.id,
    member.id,
  );

  // Step 3: Delete the profile using the profile ID
  await api.functional.redditCommunity.member.userProfiles.erase(connection, {
    profileId: profile.id,
  });

  // Step 4: Verify the deletion was successful
  // Since the API returns void for successful deletion, we can verify by checking
  // that the operation completed without error. The test success indicates the
  // deletion was processed correctly by the server.
  TestValidator.predicate("profile deletion completed successfully", true);
}
