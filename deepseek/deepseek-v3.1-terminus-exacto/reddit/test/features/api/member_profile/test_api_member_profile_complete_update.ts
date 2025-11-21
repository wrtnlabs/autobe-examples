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
 * Comprehensive profile update validation test.
 *
 * This E2E test validates the complete profile update functionality where all
 * optional fields (bio, avatar_url, location, website) are updated
 * simultaneously. The test follows a realistic workflow: member registration →
 * community creation (which automatically creates the profile) → comprehensive
 * profile update → validation of all updated fields.
 *
 * The test ensures that multiple profile fields can be modified in a single
 * operation and that the system properly handles concurrent field updates while
 * maintaining data integrity across all profile attributes.
 */
export async function test_api_member_profile_complete_update(
  connection: api.IConnection,
) {
  // Step 1: Create new member account and establish authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(2),
        href: "https://example.com/registration",
        referrer: "https://example.com/home",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create member entity which automatically creates the associated profile
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Perform comprehensive profile update with all optional fields
  const updateData = {
    bio: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    avatar_url:
      `https://example.com/avatars/${RandomGenerator.alphaNumeric(16)}.jpg` satisfies string as string,
    location: RandomGenerator.name(3),
    website:
      `https://${RandomGenerator.alphaNumeric(8)}.com` satisfies string as string,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const updatedProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.members.profiles.update(connection, {
      memberId: member.id,
      body: updateData,
    });
  typia.assert(updatedProfile);

  // Step 4: Validate that all profile fields are properly updated
  TestValidator.equals(
    "member ID should match",
    updatedProfile.member.id,
    member.id,
  );
  TestValidator.equals(
    "bio should be updated",
    updatedProfile.bio,
    updateData.bio,
  );
  TestValidator.equals(
    "avatar_url should be updated",
    updatedProfile.avatar_url,
    updateData.avatar_url,
  );
  TestValidator.equals(
    "location should be updated",
    updatedProfile.location,
    updateData.location,
  );
  TestValidator.equals(
    "website should be updated",
    updatedProfile.website,
    updateData.website,
  );

  // Validate that the profile is associated with the correct member
  TestValidator.equals(
    "member email should match",
    updatedProfile.member.email,
    member.email,
  );
  TestValidator.equals(
    "member display name should match",
    updatedProfile.member.display_name,
    member.display_name,
  );

  // Validate timestamp updates
  TestValidator.predicate(
    "updated_at should be after creation",
    new Date(updatedProfile.updated_at) > new Date(updatedProfile.created_at),
  );
}
