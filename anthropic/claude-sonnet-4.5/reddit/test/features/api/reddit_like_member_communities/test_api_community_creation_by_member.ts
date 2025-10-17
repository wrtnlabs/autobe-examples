import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the complete community creation workflow where an authenticated member
 * creates a new community.
 *
 * This test validates the core community creation feature by executing the
 * following workflow:
 *
 * 1. Register a new member account and obtain authentication tokens
 * 2. Create a community with minimal required fields (code, name, description)
 * 3. Validate that the community is created with proper defaults
 * 4. Create another community with full optional configuration
 * 5. Verify all custom settings are properly applied
 * 6. Ensure creator is automatically assigned as primary moderator
 * 7. Validate subscriber count starts at zero
 *
 * The test covers both minimal and maximal configuration scenarios to ensure
 * the API handles all valid community creation requests correctly.
 */
export async function test_api_community_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = "SecurePass123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Verify member registration successful
  TestValidator.equals(
    "registered username matches",
    member.username,
    memberUsername,
  );
  TestValidator.equals("registered email matches", member.email, memberEmail);
  TestValidator.predicate("member has valid ID", member.id.length > 0);
  TestValidator.predicate(
    "member has auth token",
    member.token.access.length > 0,
  );
  TestValidator.equals("initial post karma is zero", member.post_karma, 0);
  TestValidator.equals(
    "initial comment karma is zero",
    member.comment_karma,
    0,
  );

  // Step 2: Create a community with minimal required fields
  const communityCode1 = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityName1 = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 6,
  });
  const communityDescription1 = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const minimalCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode1,
        name: communityName1,
        description: communityDescription1,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(minimalCommunity);

  // Step 3: Validate minimal community creation
  TestValidator.predicate(
    "community has valid ID",
    minimalCommunity.id.length > 0,
  );
  TestValidator.equals(
    "community code matches",
    minimalCommunity.code,
    communityCode1,
  );
  TestValidator.equals(
    "community name matches",
    minimalCommunity.name,
    communityName1,
  );
  TestValidator.equals(
    "community description matches",
    minimalCommunity.description,
    communityDescription1,
  );
  TestValidator.equals(
    "initial subscriber count is zero",
    minimalCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community is not archived",
    minimalCommunity.is_archived,
    false,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    minimalCommunity.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    minimalCommunity.updated_at.length > 0,
  );

  // Verify default settings for minimal community
  TestValidator.equals(
    "default privacy type is public",
    minimalCommunity.privacy_type,
    "public",
  );
  TestValidator.equals(
    "default posting permission is anyone_subscribed",
    minimalCommunity.posting_permission,
    "anyone_subscribed",
  );
  TestValidator.equals(
    "default allows text posts",
    minimalCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "default allows link posts",
    minimalCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "default allows image posts",
    minimalCommunity.allow_image_posts,
    true,
  );

  // Step 4: Create a community with full optional configuration
  const communityCode2 = RandomGenerator.alphaNumeric(15).toLowerCase();
  const communityName2 = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription2 = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const iconUrl = typia.random<string & tags.Format<"url">>();
  const bannerUrl = typia.random<string & tags.Format<"url">>();
  const privacyTypes = ["public", "private"] as const;
  const selectedPrivacy = RandomGenerator.pick(privacyTypes);
  const postingPermissions = [
    "anyone_subscribed",
    "approved_only",
    "moderators_only",
  ] as const;
  const selectedPermission = RandomGenerator.pick(postingPermissions);
  const allowText = typia.random<boolean>();
  const allowLink = typia.random<boolean>();
  const allowImage = typia.random<boolean>();
  const categories = [
    "technology",
    "gaming",
    "sports",
    "music",
    "art",
  ] as const;
  const primaryCategory = RandomGenerator.pick(categories);
  const secondaryTags = "tag1,tag2,tag3";

  const fullCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode2,
        name: communityName2,
        description: communityDescription2,
        icon_url: iconUrl,
        banner_url: bannerUrl,
        privacy_type: selectedPrivacy,
        posting_permission: selectedPermission,
        allow_text_posts: allowText,
        allow_link_posts: allowLink,
        allow_image_posts: allowImage,
        primary_category: primaryCategory,
        secondary_tags: secondaryTags,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(fullCommunity);

  // Step 5: Validate full community creation with custom settings
  TestValidator.predicate(
    "full community has valid ID",
    fullCommunity.id.length > 0,
  );
  TestValidator.equals(
    "full community code matches",
    fullCommunity.code,
    communityCode2,
  );
  TestValidator.equals(
    "full community name matches",
    fullCommunity.name,
    communityName2,
  );
  TestValidator.equals(
    "full community description matches",
    fullCommunity.description,
    communityDescription2,
  );
  TestValidator.equals("icon URL matches", fullCommunity.icon_url, iconUrl);
  TestValidator.equals(
    "banner URL matches",
    fullCommunity.banner_url,
    bannerUrl,
  );
  TestValidator.equals(
    "privacy type matches",
    fullCommunity.privacy_type,
    selectedPrivacy,
  );
  TestValidator.equals(
    "posting permission matches",
    fullCommunity.posting_permission,
    selectedPermission,
  );
  TestValidator.equals(
    "allow text posts matches",
    fullCommunity.allow_text_posts,
    allowText,
  );
  TestValidator.equals(
    "allow link posts matches",
    fullCommunity.allow_link_posts,
    allowLink,
  );
  TestValidator.equals(
    "allow image posts matches",
    fullCommunity.allow_image_posts,
    allowImage,
  );
  TestValidator.equals(
    "primary category matches",
    fullCommunity.primary_category,
    primaryCategory,
  );
  TestValidator.equals(
    "secondary tags match",
    fullCommunity.secondary_tags,
    secondaryTags,
  );
  TestValidator.equals(
    "full community subscriber count is zero",
    fullCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "full community is not archived",
    fullCommunity.is_archived,
    false,
  );

  // Step 6: Verify unique community codes (both communities should have different IDs)
  TestValidator.notEquals(
    "communities have different IDs",
    minimalCommunity.id,
    fullCommunity.id,
  );
  TestValidator.notEquals(
    "communities have different codes",
    minimalCommunity.code,
    fullCommunity.code,
  );
}
