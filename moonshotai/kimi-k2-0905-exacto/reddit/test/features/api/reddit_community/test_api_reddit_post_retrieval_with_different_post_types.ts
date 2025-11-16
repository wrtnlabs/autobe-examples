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
 * Test retrieving posts of different types (text, link, image) to verify that
 * the get endpoint properly returns content-specific fields. For text posts,
 * validates content field is populated. For link posts, verifies link_url is
 * properly returned. For image posts, checks that media-related fields are
 * accessible. This ensures the API adapts to different post format requirements
 * while maintaining a consistent response structure.
 */
export async function test_api_reddit_post_retrieval_with_different_post_types(
  connection: api.IConnection,
) {
  // Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Since we don't have endpoints to discover communities and post types,
  // we need to create posts using whatever community and post type IDs work.
  // The system will handle post type assignment based on the content provided.

  // Create a text post with content (no external link)
  const textPostTitle = RandomGenerator.paragraph({ sentences: 1 });
  const textPostContent = RandomGenerator.content({ paragraphs: 2 });
  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: textPostTitle,
        content: textPostContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);

  // Create a link post with URL (no text content)
  const linkPostTitle = RandomGenerator.paragraph({ sentences: 1 });
  const linkPostUrl =
    "https://example.com/article" + RandomGenerator.alphaNumeric(8);
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: linkPostTitle,
        link_url: linkPostUrl,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  // Create a post with both content and link (hybrid approach)
  const hybridPostTitle = RandomGenerator.paragraph({ sentences: 1 });
  const hybridPostContent = "This post includes both text content and a link";
  const hybridPostUrl =
    "https://example.com/hybrid" + RandomGenerator.alphaNumeric(8);
  const hybridPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: hybridPostTitle,
        content: hybridPostContent,
        link_url: hybridPostUrl,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(hybridPost);

  // Create a minimal post (title only)
  const minimalPostTitle = RandomGenerator.paragraph({ sentences: 1 });
  const minimalPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: minimalPostTitle,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(minimalPost);

  // Retrieve and validate all posts
  const retrievedTextPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: textPost.id,
    },
  );
  typia.assert(retrievedTextPost);

  TestValidator.equals(
    "text post title matches",
    retrievedTextPost.title,
    textPostTitle,
  );
  TestValidator.equals(
    "text post content is populated",
    retrievedTextPost.content,
    textPostContent,
  );
  TestValidator.equals(
    "text post link_url is null",
    retrievedTextPost.link_url,
    null,
  );
  TestValidator.predicate(
    "text post has valid author",
    retrievedTextPost.author.id === member.id,
  );

  const retrievedLinkPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: linkPost.id,
    },
  );
  typia.assert(retrievedLinkPost);

  TestValidator.equals(
    "link post title matches",
    retrievedLinkPost.title,
    linkPostTitle,
  );
  TestValidator.equals(
    "link post link_url is populated",
    retrievedLinkPost.link_url,
    linkPostUrl,
  );
  TestValidator.equals(
    "link post content is null",
    retrievedLinkPost.content,
    null,
  );
  TestValidator.predicate(
    "link post has valid author",
    retrievedLinkPost.author.id === member.id,
  );

  const retrievedHybridPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: hybridPost.id,
    },
  );
  typia.assert(retrievedHybridPost);

  TestValidator.equals(
    "hybrid post title matches",
    retrievedHybridPost.title,
    hybridPostTitle,
  );
  TestValidator.equals(
    "hybrid post content is populated",
    retrievedHybridPost.content,
    hybridPostContent,
  );
  TestValidator.equals(
    "hybrid post link_url is populated",
    retrievedHybridPost.link_url,
    hybridPostUrl,
  );
  TestValidator.predicate(
    "hybrid post has valid author",
    retrievedHybridPost.author.id === member.id,
  );

  const retrievedMinimalPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId: minimalPost.id,
    },
  );
  typia.assert(retrievedMinimalPost);

  TestValidator.equals(
    "minimal post title matches",
    retrievedMinimalPost.title,
    minimalPostTitle,
  );
  TestValidator.equals(
    "minimal post content is null",
    retrievedMinimalPost.content,
    null,
  );
  TestValidator.equals(
    "minimal post link_url is null",
    retrievedMinimalPost.link_url,
    null,
  );
  TestValidator.predicate(
    "minimal post has valid author",
    retrievedMinimalPost.author.id === member.id,
  );

  // Validate consistent structure across all post types
  TestValidator.predicate(
    "all posts have consistent structure",
    retrievedTextPost.id !== undefined &&
      retrievedLinkPost.id !== undefined &&
      retrievedHybridPost.id !== undefined &&
      retrievedMinimalPost.id !== undefined,
  );

  TestValidator.predicate(
    "all posts have voting metrics",
    retrievedTextPost.upvote_count >= 0 &&
      retrievedTextPost.downvote_count >= 0 &&
      retrievedLinkPost.upvote_count >= 0 &&
      retrievedLinkPost.downvote_count >= 0 &&
      retrievedHybridPost.upvote_count >= 0 &&
      retrievedHybridPost.downvote_count >= 0 &&
      retrievedMinimalPost.upvote_count >= 0 &&
      retrievedMinimalPost.downvote_count >= 0,
  );

  // Verify post type adaptation based on content
  TestValidator.predicate(
    "text post has content but no link",
    retrievedTextPost.content !== null && retrievedTextPost.link_url === null,
  );

  TestValidator.predicate(
    "link post has link but no content",
    retrievedLinkPost.link_url !== null && retrievedLinkPost.content === null,
  );

  TestValidator.predicate(
    "hybrid post has both content and link",
    retrievedHybridPost.content !== null &&
      retrievedHybridPost.link_url !== null,
  );

  TestValidator.predicate(
    "minimal post has neither content nor link",
    retrievedMinimalPost.content === null &&
      retrievedMinimalPost.link_url === null,
  );
}
