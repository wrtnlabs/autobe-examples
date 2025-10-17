import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test updating community configuration settings by a moderator.
 *
 * This test validates that a community moderator can successfully update
 * various community settings including description, visual branding, posting
 * permissions, and content type restrictions.
 *
 * Workflow:
 *
 * 1. Register a new member account (becomes community creator and primary
 *    moderator)
 * 2. Create a community as the authenticated member
 * 3. Update community settings with new configuration values
 * 4. Validate all updated fields are properly saved and returned
 * 5. Verify privacy type and posting permission changes are handled correctly
 */
export async function test_api_community_settings_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community (member becomes primary moderator)
  const communityCode = RandomGenerator.alphaNumeric(15);
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Validate initial community creation
  TestValidator.equals("community code matches", community.code, communityCode);
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "initial privacy is public",
    community.privacy_type,
    "public",
  );
  TestValidator.equals(
    "initial posting permission",
    community.posting_permission,
    "anyone_subscribed",
  );

  // Step 3: Update community settings
  const updatedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 6,
  });
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedIconUrl = `https://example.com/icon/${typia.random<string & tags.Format<"uuid">>()}.png`;
  const updatedBannerUrl = `https://example.com/banner/${typia.random<string & tags.Format<"uuid">>()}.jpg`;

  const updatedCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: community.id,
      body: {
        name: updatedName,
        description: updatedDescription,
        icon_url: updatedIconUrl,
        banner_url: updatedBannerUrl,
        privacy_type: "private",
        posting_permission: "moderators_only",
        allow_text_posts: true,
        allow_link_posts: false,
        allow_image_posts: true,
        primary_category: "science",
        secondary_tags: "research,academic,discussion",
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);

  // Step 4: Validate all updated fields
  TestValidator.equals(
    "community ID unchanged",
    updatedCommunity.id,
    community.id,
  );
  TestValidator.equals(
    "community code unchanged",
    updatedCommunity.code,
    communityCode,
  );
  TestValidator.equals(
    "updated name matches",
    updatedCommunity.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description matches",
    updatedCommunity.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated icon url matches",
    updatedCommunity.icon_url,
    updatedIconUrl,
  );
  TestValidator.equals(
    "updated banner url matches",
    updatedCommunity.banner_url,
    updatedBannerUrl,
  );
  TestValidator.equals(
    "privacy changed to private",
    updatedCommunity.privacy_type,
    "private",
  );
  TestValidator.equals(
    "posting permission changed to moderators only",
    updatedCommunity.posting_permission,
    "moderators_only",
  );
  TestValidator.equals(
    "text posts still allowed",
    updatedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts disabled",
    updatedCommunity.allow_link_posts,
    false,
  );
  TestValidator.equals(
    "image posts allowed",
    updatedCommunity.allow_image_posts,
    true,
  );
  TestValidator.equals(
    "primary category updated",
    updatedCommunity.primary_category,
    "science",
  );
  TestValidator.equals(
    "secondary tags updated",
    updatedCommunity.secondary_tags,
    "research,academic,discussion",
  );

  // Verify subscriber count unchanged
  TestValidator.equals(
    "subscriber count unchanged",
    updatedCommunity.subscriber_count,
    community.subscriber_count,
  );
}
