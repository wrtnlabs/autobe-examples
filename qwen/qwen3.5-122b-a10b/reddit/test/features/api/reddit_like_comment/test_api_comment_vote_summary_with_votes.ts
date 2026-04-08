import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test retrieving vote summary for a comment.
 *
 * Validates the vote summary endpoint by creating a comment and retrieving its vote summary. Since the voting API is not available in the current SDK, this test verifies that the vote summary endpoint returns the correct structure with zero vote counts for a newly created comment.
 *
 * 1. Create and authenticate a member account.
 * 2. Create a community for posting.
 * 3. Create a text post in the community.
 * 4. Create a comment on the post.
 * 5. Retrieve the vote summary and verify the structure.
 * 6. Validate that vote counts are zero for a new comment.
 */
export async function test_api_comment_vote_summary_with_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      member1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Retrieve and validate vote summary
  // Note: Voting API is not available, so we test with a comment that has 0 votes
  const voteSummary =
    await api.functional.redditLike.member.comments.vote_summary.at(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(voteSummary);
  // Validate the vote summary structure
  TestValidator.equals("comment id matches", voteSummary.id, comment.id);
  TestValidator.equals("upvote count is zero", voteSummary.upvote_count, 0);
  TestValidator.equals("downvote count is zero", voteSummary.downvote_count, 0);
  TestValidator.equals("vote score is zero", voteSummary.vote_score, 0);
  TestValidator.predicate(
    "vote score equals upvotes minus downvotes",
    voteSummary.vote_score ===
      voteSummary.upvote_count - voteSummary.downvote_count,
  );
}
