import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test updating a post's community association by transferring it between
 * communities. Validates that posts can be moved from one community to another
 * by their authors using the reddit_community_id field in
 * IRedditCommunityPost.IUpdate, enabling content reorganization when posts are
 * created in incorrect communities or need recategorization based on topic
 * changes.
 *
 * 1. Create authenticated member for cross-community post management
 * 2. Create source community for initial post creation
 * 3. Create destination community for post transfer testing
 * 4. Create post in source community
 * 5. Transfer post to destination community using update API
 * 6. Verify post now belongs to destination community with updated properties
 */
export async function test_api_post_update_with_optional_community_transfer(
  connection: api.IConnection,
) {
  // 1. Create authenticated member for cross-community post management
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // 2. Create source community for initial post creation
  const sourceCommunityName = RandomGenerator.alphabets(8);
  const sourceCommunityData = {
    name: `${sourceCommunityName}_source` satisfies string,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_name: "Technology",
    type: RandomGenerator.pick(["public", "restricted", "private"] as const),
  } satisfies IRedditCommunityCommunity.ICreate;

  const sourceCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: sourceCommunityData,
    });
  typia.assert(sourceCommunity);

  // 3. Create destination community for post transfer testing
  const destinationCommunityName = RandomGenerator.alphabets(8);
  const destinationCommunityData = {
    name: `${destinationCommunityName}_destination` satisfies string,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    category_name: "Technology",
    type: RandomGenerator.pick(["public", "restricted", "private"] as const),
  } satisfies IRedditCommunityCommunity.ICreate;

  const destinationCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: destinationCommunityData,
    });
  typia.assert(destinationCommunity);

  // 4. Create post in source community
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const originalPostData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    reddit_community_id: sourceCommunity.id,
    reddit_post_type_id: postTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const originalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: originalPostData,
    },
  );
  typia.assert(originalPost);

  // Verify original post is in source community
  TestValidator.equals(
    "post belongs to source community initially",
    originalPost.community.id,
    sourceCommunity.id,
  );
  TestValidator.equals(
    "original post title matches",
    originalPost.title,
    originalPostData.title,
  );

  // 5. Transfer post to destination community using update API
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const updateRequest = {
    title: updatedTitle,
    content: updatedContent,
    reddit_community_id: destinationCommunity.id,
  } satisfies IRedditCommunityPost.IUpdate;

  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    connection,
    {
      postId: originalPost.id,
      body: updateRequest,
    },
  );
  typia.assert(updatedPost);

  // 6. Verify post was successfully transferred to destination community
  TestValidator.equals(
    "post now belongs to destination community",
    updatedPost.community.id,
    destinationCommunity.id,
  );
  TestValidator.equals(
    "post title updated correctly",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post content updated correctly",
    updatedPost.content,
    updatedContent,
  );
  TestValidator.equals(
    "post id remains the same",
    updatedPost.id,
    originalPost.id,
  );
  TestValidator.equals(
    "post author remains the same",
    updatedPost.author.id,
    originalPost.author.id,
  );

  // Verify community context changed
  TestValidator.notEquals(
    "post community context changed",
    updatedPost.community.id,
    originalPost.community.id,
  );
}
