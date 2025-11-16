import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfiles";

/** Update display name only while preserving other profile information */
export async function test_api_user_profile_update_display_name_only(
  connection: api.IConnection,
) {
  // Step 1: Join as a new member to establish authentication context
  const memberCredentials = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(memberCredentials);

  // Step 2: Create a user profile with complete information
  const initialAvatar = "https://example.com/avatar.jpg";
  const initialBio = RandomGenerator.paragraph({ sentences: 3 });
  const initialWebsite = "https://example.com";
  const initialLocation = "New York";
  const initialBanner = "https://example.com/banner.png";

  const originalProfile =
    await api.functional.redditCommunity.member.userProfiles.create(
      connection,
      {
        body: {
          display_name: "Original Display Name",
          bio: initialBio,
          location: initialLocation,
          website_url: initialWebsite,
          avatar_url: initialAvatar,
          profile_banner_url: initialBanner,
          href: "https://example.com/profile",
          referrer: "https://example.com/home",
          ip: "127.0.0.1",
        } satisfies IRedditCommunityUserProfiles.ICreate,
      },
    );
  typia.assert(originalProfile);

  // Step 3: Update only the display name
  const updatedProfile =
    await api.functional.redditCommunity.member.userProfiles.update(
      connection,
      {
        profileId: originalProfile.id,
        body: {
          display_name: "Updated Display Name",
        } satisfies IRedditCommunityUserProfiles.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify all other properties remain unchanged
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    "Updated Display Name",
  );
  TestValidator.equals(
    "bio preserved",
    updatedProfile.bio,
    originalProfile.bio,
  );
  TestValidator.equals(
    "location preserved",
    updatedProfile.location,
    originalProfile.location,
  );
  TestValidator.equals(
    "website_url preserved",
    updatedProfile.website_url,
    originalProfile.website_url,
  );
  TestValidator.equals(
    "avatar_url preserved",
    updatedProfile.avatar_url,
    originalProfile.avatar_url,
  );
  TestValidator.equals(
    "profile_banner_url preserved",
    updatedProfile.profile_banner_url,
    originalProfile.profile_banner_url,
  );

  // Step 5: Verify profile was actually updated with new timestamp
  TestValidator.notEquals(
    "updated_at changed",
    updatedProfile.updated_at,
    originalProfile.updated_at,
  );
  TestValidator.equals(
    "member ref preserved",
    updatedProfile.member.id,
    originalProfile.member.id,
  );
}
