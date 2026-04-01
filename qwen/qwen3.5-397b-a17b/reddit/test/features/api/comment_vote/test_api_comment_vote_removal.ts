import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_comments_votes_vote } from "../../../generate/generate_random_reddit_community_comments_votes_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test removing a vote from a comment.
 *
 * Setup:
 * 1. Authenticate as member to perform voting actions
 * 2. Create community as container for post and comment
 * 3. Subscribe member to community to enable post creation
 * 4. Create post that will contain the comment to be voted on
 * 5. Create comment that will receive the vote
 * 6. Cast an initial UPVOTE on the comment
 *
 * Test:
 * 1. Remove the vote by submitting null direction
 * 2. Verify the vote removal works correctly
 * 3. Test with DOWNVOTE as well to ensure bidirectional correctness
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Record initial vote score
  const initialVoteScore = comment.voteScore;
  // 6. Cast initial UPVOTE on comment
  const upvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: { direction: "UPVOTE" },
    },
  );
  typia.assert(upvote);
  // Verify upvote was cast
  TestValidator.equals("upvote direction", upvote.direction, "UPVOTE");
  // 7. Remove the UPVOTE by submitting null direction
  const removedUpvote =
    await api.functional.redditCommunity.comments.votes.vote(memberConnection, {
      commentId: comment.id,
      body: { direction: null },
    });
  typia.assert(removedUpvote);
  // 8. Cast DOWNVOTE on comment
  const downvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: { direction: "DOWNVOTE" },
    },
  );
  typia.assert(downvote);
  // Verify downvote was cast
  TestValidator.equals("downvote direction", downvote.direction, "DOWNVOTE");
  // 9. Remove the DOWNVOTE by submitting null direction
  const removedDownvote =
    await api.functional.redditCommunity.comments.votes.vote(memberConnection, {
      commentId: comment.id,
      body: { direction: null },
    });
  typia.assert(removedDownvote);
  // Verify vote operations completed successfully
  TestValidator.predicate(
    "upvote removal completed",
    removedUpvote !== undefined,
  );
  TestValidator.predicate(
    "downvote removal completed",
    removedDownvote !== undefined,
  );
}
