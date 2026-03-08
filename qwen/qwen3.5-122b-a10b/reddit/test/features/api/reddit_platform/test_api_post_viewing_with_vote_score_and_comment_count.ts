import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that viewing a specific post returns complete post details including dynamically calculated vote score and comment count.
 * 1. Create author member account
 * 2. Create community
 * 3. Subscribe author to community
 * 4. Create text post in the community
 * 5. Create voter member account
 * 6. Cast votes from voter (upvote, downvote, change vote)
 * 7. Create multiple comments including nested replies
 * 8. Retrieve post via GET /redditPlatform/posts/{postId}
 * 9. Verify vote_score calculation (upvotes - downvotes)
 * 10. Verify comment_count (total comments including nested)
 * 11. Verify author info (username, karma_score)
 * 12. Verify community info (name, subscriber_count)
 * 13. Test guest access (no auth required)
 */
export async function test_api_post_viewing_with_vote_score_and_comment_count(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe author to community (auto-subscribed on creation, but verify)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create text post in the community
  const textContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: textContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(voterAuth);
  // 6. Cast votes from voter
  // First upvote
  const vote1 = await api.functional.redditPlatform.member.posts.vote(
    voterConnection,
    {
      postId: post.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote1);
  // Change to downvote
  const vote2 = await api.functional.redditPlatform.member.posts.vote(
    voterConnection,
    {
      postId: post.id,
      body: { type: "downvote" } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote2);
  // Change back to upvote
  const vote3 = await api.functional.redditPlatform.member.posts.vote(
    voterConnection,
    {
      postId: post.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote3);
  // Remove vote
  const vote4 = await api.functional.redditPlatform.member.posts.vote(
    voterConnection,
    {
      postId: post.id,
      body: { type: "remove" } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote4);
  // Final upvote
  const vote5 = await api.functional.redditPlatform.member.posts.vote(
    voterConnection,
    {
      postId: post.id,
      body: { type: "upvote" } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(vote5);
  // 7. Create multiple comments including nested replies
  const comment1 =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Nested reply to comment1
  const comment3 =
    await generate_random_reddit_platform_member_posts_comments_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment1.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment3);
  // Another nested reply to comment3 (3 levels deep)
  const comment4 =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: comment3.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment4);
  // 8. Retrieve post via GET /redditPlatform/posts/{postId}
  const retrievedPost = await api.functional.redditPlatform.posts.at(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 9. Verify vote_score calculation (should be 1 from final upvote)
  TestValidator.equals("vote score matches", retrievedPost.vote_score, 1);
  // 10. Verify comment_count (should be 4 total comments including nested)
  TestValidator.equals("comment count matches", retrievedPost.comment_count, 4);
  // 11. Verify author info
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    authorAuth.username,
  );
  TestValidator.predicate(
    "author has karma score",
    retrievedPost.author.karma_score >= 0,
  );
  // 12. Verify community info
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.predicate(
    "community subscriber count is at least 1",
    retrievedPost.community.subscriber_count >= 1,
  );
  // 13. Verify post content
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "post text content matches",
    retrievedPost.text_content,
    textContent,
  );
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
}