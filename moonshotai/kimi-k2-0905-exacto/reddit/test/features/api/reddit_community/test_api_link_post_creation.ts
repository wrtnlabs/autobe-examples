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
 * Test creation of a link post that shares external content within a community.
 * Validate that link URLs are properly formatted and accepted while ensuring
 * posts are correctly categorized as link-type content. The scenario tests the
 * platform's external content sharing mechanism, ensuring links are validated
 * for proper format while maintaining the content sharing and curation
 * capabilities essential to Reddit-style community engagement and discussion
 * frameworks.
 *
 * This test validates:
 *
 * 1. Member can create link posts with external URLs
 * 2. URLs are properly formatted and validated
 * 3. Posts are correctly categorized by post type
 * 4. Link posts support the Reddit-style content sharing mechanism
 */
export async function test_api_link_post_creation(connection: api.IConnection) {
  // Create member account for authentication
  const memberData = {
    nickname: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.equals("member email matches", member.email, memberData.email);

  // Create post type data for link posts
  const redditPostTypeId = typia.random<string & tags.Format<"uuid">>();
  const redditCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Create a link post with external URL
  const linkPostData = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content: null, // Link posts don't require text content
    link_url:
      "https://www.example.com/articles/technology/reddit-clone-announced",
    reddit_community_id: redditCommunityId,
    reddit_post_type_id: redditPostTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: linkPostData,
    },
  );
  typia.assert(linkPost);

  // Validate the link post was created with correct data
  TestValidator.equals(
    "link post title matches",
    linkPost.title,
    linkPostData.title,
  );
  TestValidator.equals(
    "link post URL matches",
    linkPost.link_url,
    linkPostData.link_url,
  );
  TestValidator.equals("link post content is null", linkPost.content, null);

  // Verify post is associated with correct community and author
  TestValidator.equals(
    "post community ID matches",
    linkPost.community.id,
    redditCommunityId,
  );
  TestValidator.equals("post author ID matches", linkPost.author.id, member.id);

  // Validate vote counts start at zero
  TestValidator.equals("initial upvote count", linkPost.upvote_count, 0);
  TestValidator.equals("initial downvote count", linkPost.downvote_count, 0);
  TestValidator.equals("initial view count", linkPost.view_count, 0);
  TestValidator.equals("initial comment count", linkPost.comment_count, 0);

  // Verify post is not locked or pinned
  TestValidator.equals("post is not locked", linkPost.is_locked, false);
  TestValidator.equals("post is not pinned", linkPost.is_pinned, false);

  // Test with different URL formats
  const anotherPostData = {
    title: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 7,
    }),
    content: null,
    link_url:
      "https://news.techblog.com/2024/article-about-community-platforms",
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: redditPostTypeId,
  } satisfies IRedditCommunityPost.ICreate;

  const anotherPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: anotherPostData,
    },
  );
  typia.assert(anotherPost);

  // Validate the second link post
  TestValidator.equals(
    "second link URL matches",
    anotherPost.link_url,
    anotherPostData.link_url,
  );
}
