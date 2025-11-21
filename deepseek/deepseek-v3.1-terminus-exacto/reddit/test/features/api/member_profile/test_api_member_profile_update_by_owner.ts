import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Test that authenticated members can update their own profile information with
 * partial field modifications. This scenario validates the profile update
 * workflow including authentication verification, field validation, partial
 * update support, and timestamp updates. The test ensures that optional fields
 * can be individually updated without affecting other profile data and that the
 * updated_at timestamp is properly maintained.
 */
export async function test_api_member_profile_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a member entity which automatically creates the associated profile
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test partial profile update with bio field only
  const bioUpdate: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: {
        bio: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(bioUpdate);
  TestValidator.equals(
    "profile bio should be updated",
    true,
    bioUpdate.bio !== undefined,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after bio update",
    bioUpdate.updated_at,
    bioUpdate.created_at,
  );

  // Step 4: Test partial profile update with avatar_url field only
  const avatarUpdate: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: {
        avatar_url: "https://example.com/avatar.jpg",
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(avatarUpdate);
  TestValidator.equals(
    "profile avatar_url should be updated",
    avatarUpdate.avatar_url,
    "https://example.com/avatar.jpg",
  );
  TestValidator.equals(
    "bio should remain unchanged after avatar update",
    avatarUpdate.bio,
    bioUpdate.bio,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after avatar update",
    avatarUpdate.updated_at,
    bioUpdate.updated_at,
  );

  // Step 5: Test partial profile update with location field only
  const locationUpdate: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: {
        location: "Seoul, South Korea",
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(locationUpdate);
  TestValidator.equals(
    "profile location should be updated",
    locationUpdate.location,
    "Seoul, South Korea",
  );
  TestValidator.equals(
    "avatar_url should remain unchanged after location update",
    locationUpdate.avatar_url,
    avatarUpdate.avatar_url,
  );
  TestValidator.equals(
    "bio should remain unchanged after location update",
    locationUpdate.bio,
    bioUpdate.bio,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after location update",
    locationUpdate.updated_at,
    avatarUpdate.updated_at,
  );

  // Step 6: Test partial profile update with website field only
  const websiteUpdate: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: {
        website: "https://example.com/personal-site",
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(websiteUpdate);
  TestValidator.equals(
    "profile website should be updated",
    websiteUpdate.website,
    "https://example.com/personal-site",
  );
  TestValidator.equals(
    "location should remain unchanged after website update",
    websiteUpdate.location,
    locationUpdate.location,
  );
  TestValidator.equals(
    "avatar_url should remain unchanged after website update",
    websiteUpdate.avatar_url,
    avatarUpdate.avatar_url,
  );
  TestValidator.equals(
    "bio should remain unchanged after website update",
    websiteUpdate.bio,
    bioUpdate.bio,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after website update",
    websiteUpdate.updated_at,
    locationUpdate.updated_at,
  );

  // Step 7: Test comprehensive profile update with all fields
  const comprehensiveUpdate: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: {
        bio: RandomGenerator.content({ paragraphs: 2 }),
        avatar_url: "https://example.com/new-avatar.png",
        location: "New York, USA",
        website: "https://example.com/new-site",
      } satisfies ICommunityPlatformUserProfile.IUpdate,
    });
  typia.assert(comprehensiveUpdate);
  TestValidator.equals(
    "bio should be updated in comprehensive update",
    true,
    comprehensiveUpdate.bio !== undefined,
  );
  TestValidator.equals(
    "avatar_url should be updated in comprehensive update",
    comprehensiveUpdate.avatar_url,
    "https://example.com/new-avatar.png",
  );
  TestValidator.equals(
    "location should be updated in comprehensive update",
    comprehensiveUpdate.location,
    "New York, USA",
  );
  TestValidator.equals(
    "website should be updated in comprehensive update",
    comprehensiveUpdate.website,
    "https://example.com/new-site",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after comprehensive update",
    comprehensiveUpdate.updated_at,
    websiteUpdate.updated_at,
  );

  // Step 8: Verify member reference remains consistent
  TestValidator.equals(
    "member ID should remain consistent throughout updates",
    comprehensiveUpdate.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email should remain consistent",
    comprehensiveUpdate.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display_name should remain consistent",
    comprehensiveUpdate.member.display_name,
    member.display_name,
  );
}
