import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test the popular feed functionality that displays posts from all communities without requiring authentication.
 *
 * Validates the complete popular feed workflow including member authentication for post creation, multi-type post generation, voting mechanics, and unauthenticated feed retrieval. Ensures that the popular feed correctly aggregates posts from all communities with proper sorting by hotness (combination of recency and engagement).
 *
 * Special attention is given to verifying pagination metadata accuracy, post summary structure completeness, and that the feed is accessible without authentication while posts are created by authenticated members.
 *
 * 1. Authenticate a member account with email, password, and username.
 * 2. Create multiple posts with different content types (text, link, image).
 * 3. Add votes to posts to vary their scores (upvotes and downvotes).
 * 4. Call the popular feed endpoint without authentication using base connection.
 * 5. Verify pagination metadata and post summary structure.
 * 6. Validate that posts are sorted by hotness and all created posts appear in results.
 */
export async function test_api_post_list_popular_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member for post creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create multiple posts with different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: "Text Post Test",
        text_content: "This is a text post content for testing popular feed.",
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "link",
        title: "Link Post Test",
        link_url: "https://example.com/test-article",
      },
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        post_type: "image",
        title: "Image Post Test",
        image_url: "https://example.com/test-image.jpg",
      },
    },
  );
  typia.assert(imagePost);
  // 3. Add votes to posts to vary scores
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: textPost.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: linkPost.id },
      body: { vote_type: "upvote" },
    },
  );
  await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: imagePost.id },
      body: { vote_type: "downvote" },
    },
  );
  // Add another upvote to text post to make it have higher score
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, { body: {} });
  await generate_random_reddit_clone_member_posts_votes_create(
    voterConnection,
    {
      params: { postId: textPost.id },
      body: { vote_type: "upvote" },
    },
  );
  // 4. Call popular feed endpoint WITHOUT authentication (use base connection)
  const feed = await api.functional.redditClone.posts.index(connection, {
    body: {} satisfies IRedditClonePost.IRequest,
  });
  typia.assert(feed);
  // 5. Verify pagination metadata
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    feed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    feed.pagination.records > 0,
  );
  TestValidator.predicate("pagination has pages", feed.pagination.pages > 0);
  // 6. Verify posts are returned
  TestValidator.predicate("feed contains posts", feed.data.length > 0);
  // 7. Verify our created posts are in the feed
  const feedPostIds = feed.data.map((p) => p.id);
  TestValidator.predicate(
    "text post in feed",
    feedPostIds.includes(textPost.id),
  );
  TestValidator.predicate(
    "link post in feed",
    feedPostIds.includes(linkPost.id),
  );
  TestValidator.predicate(
    "image post in feed",
    feedPostIds.includes(imagePost.id),
  );
  // 8. Verify vote scores are calculated correctly
  const textPostInFeed = feed.data.find((p) => p.id === textPost.id);
  const linkPostInFeed = feed.data.find((p) => p.id === linkPost.id);
  const imagePostInFeed = feed.data.find((p) => p.id === imagePost.id);
  typia.assertGuard(textPostInFeed!);
  typia.assertGuard(linkPostInFeed!);
  typia.assertGuard(imagePostInFeed!);
  TestValidator.equals("text post vote score", textPostInFeed.vote_score, 2);
  TestValidator.equals("link post vote score", linkPostInFeed.vote_score, 1);
  TestValidator.equals("image post vote score", imagePostInFeed.vote_score, -1);
  // 9. Verify posts are sorted by hot (text post with highest score should appear earlier)
  const textPostIndex = feed.data.findIndex((p) => p.id === textPost.id);
  const linkPostIndex = feed.data.findIndex((p) => p.id === linkPost.id);
  const imagePostIndex = feed.data.findIndex((p) => p.id === imagePost.id);
  TestValidator.predicate(
    "posts sorted by hotness (higher score posts appear earlier)",
    textPostIndex < imagePostIndex && linkPostIndex < imagePostIndex,
  );
}
