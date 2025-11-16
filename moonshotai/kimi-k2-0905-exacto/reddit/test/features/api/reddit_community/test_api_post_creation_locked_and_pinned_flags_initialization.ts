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
 * Test that posts are created with appropriate initial states for moderation
 * flags including is_locked and is_pinned properties. Validates that new posts
 * default to unlocked and unpinned states unless specifically modified by
 * moderators, enabling normal community discussion flow while supporting
 * platform moderation capabilities.
 *
 * Test flow:
 *
 * 1. Create member account for authentication
 * 2. Create text post and verify default moderation flag states
 * 3. Create link post and verify default moderation flag states
 * 4. Validate that vote counts, view counts, and comment counts are properly
 *    initialized
 * 5. Verify that posts can be created with different content types while
 *    maintaining unlocked/unpinned defaults
 */
export async function test_api_post_creation_locked_and_pinned_flags_initialization(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    nickname: RandomGenerator.alphabets(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCredentials,
    });
  typia.assert(member);

  // Generate test data for text post
  const textPostData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  // Step 2: Create text post and verify default moderation flag states
  const textPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: textPostData,
    });
  typia.assert(textPost);

  // Verify default moderation flags are set to false (unlocked and unpinned)
  TestValidator.equals(
    "text post is unlocked by default",
    textPost.is_locked,
    false,
  );
  TestValidator.equals(
    "text post is unpinned by default",
    textPost.is_pinned,
    false,
  );

  // Verify engagement metrics are initialized to zero
  TestValidator.equals(
    "text post upvote count initialized to zero",
    textPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "text post downvote count initialized to zero",
    textPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "text post view count initialized to zero",
    textPost.view_count,
    0,
  );
  TestValidator.equals(
    "text post comment count initialized to zero",
    textPost.comment_count,
    0,
  );

  // Verify core post properties
  TestValidator.equals(
    "text post title matches input",
    textPost.title,
    textPostData.title,
  );
  TestValidator.equals(
    "text post content matches input",
    textPost.content,
    textPostData.content,
  );
  TestValidator.equals(
    "text post has valid community reference",
    textPost.community.id,
    textPostData.reddit_community_id,
  );
  TestValidator.equals(
    "text post has valid author reference",
    textPost.author.id,
    member.id,
  );

  // Step 3: Create link post and verify moderation flags
  const linkPostData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 6 }),
    link_url: `https://example.com/${RandomGenerator.alphabets(8)}.html`,
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const linkPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: linkPostData,
    });
  typia.assert(linkPost);

  // Verify link post also defaults to unlocked/unpinned
  TestValidator.equals(
    "link post is unlocked by default",
    linkPost.is_locked,
    false,
  );
  TestValidator.equals(
    "link post is unpinned by default",
    linkPost.is_pinned,
    false,
  );

  // Verify engagement metrics are initialized to zero for link post
  TestValidator.equals(
    "link post upvote count initialized to zero",
    linkPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "link post downvote count initialized to zero",
    linkPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "link post view count initialized to zero",
    linkPost.view_count,
    0,
  );
  TestValidator.equals(
    "link post comment count initialized to zero",
    linkPost.comment_count,
    0,
  );

  // Verify link post properties
  TestValidator.equals(
    "link post title matches input",
    linkPost.title,
    linkPostData.title,
  );
  TestValidator.equals(
    "link post URL matches input",
    linkPost.link_url,
    linkPostData.link_url,
  );

  // Step 4: Create a content-only post to test minimal content
  const contentOnlyData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 12,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const contentPost: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: contentOnlyData,
    });
  typia.assert(contentPost);

  // Verify content-only post follows the same moderation flag pattern
  TestValidator.equals(
    "content-only post is unlocked by default",
    contentPost.is_locked,
    false,
  );
  TestValidator.equals(
    "content-only post is unpinned by default",
    contentPost.is_pinned,
    false,
  );

  // Step 5: Validate universal initialization pattern across all post types
  TestValidator.predicate(
    "all posts have zero engagement metrics",
    () =>
      textPost.upvote_count === 0 &&
      textPost.downvote_count === 0 &&
      textPost.view_count === 0 &&
      textPost.comment_count === 0 &&
      linkPost.upvote_count === 0 &&
      linkPost.downvote_count === 0 &&
      linkPost.view_count === 0 &&
      linkPost.comment_count === 0 &&
      contentPost.upvote_count === 0 &&
      contentPost.downvote_count === 0 &&
      contentPost.view_count === 0 &&
      contentPost.comment_count === 0,
  );

  TestValidator.predicate(
    "all posts have valid timestamps",
    () =>
      textPost.created_at !== null &&
      textPost.created_at !== undefined &&
      linkPost.created_at !== null &&
      linkPost.created_at !== undefined &&
      contentPost.created_at !== null &&
      contentPost.created_at !== undefined,
  );

  TestValidator.equals(
    "all posts have valid author references",
    textPost.author.nickname,
    memberCredentials.nickname,
  );
  TestValidator.equals(
    "link post has valid link URL format",
    linkPost.link_url,
    linkPostData.link_url,
  );
}
