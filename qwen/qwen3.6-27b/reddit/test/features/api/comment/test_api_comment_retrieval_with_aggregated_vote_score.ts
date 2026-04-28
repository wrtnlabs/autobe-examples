import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test retrieving a comment that has been voted on by another member.
 *
 * Validates the complete workflow where a comment created by one member is
 * upvoted by a different member, and the aggregated vote score is correctly
 * computed and returned when retrieving the comment. This tests the dynamic
 * vote score aggregation from the comment_votes table, confirming that the
 * net score calculation (count of up votes minus count of down votes) is
 * correctly computed in the comment detail response.
 *
 * 1. Authenticate as member A who will create the comment.
 * 2. Create a community and subscribe member A to it.
 * 3. Create a post in the subscribed community as member A.
 * 4. Create a comment on the post by member A.
 * 5. Authenticate as member B (a different user) who will vote on the comment.
 * 6. Cast an upvote on the comment as member B.
 * 7. Retrieve the comment as member A and verify that the voteScore is 1.
 */
export async function test_api_comment_retrieval_with_aggregated_vote_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (comment creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, { body: {} });
  // 2. Create a community as member A
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Subscribe member A to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create a post in the community as member A
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a comment on the post by member A
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // 6. Authenticate as member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, { body: {} });
  // 7. Cast an upvote on the comment as member B
  const vote =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      memberBConnection,
      { commentId: comment.id },
    );
  typia.assert(vote);
  // 8. Retrieve the comment as member A and verify voteScore
  const retrievedComment =
    await api.functional.redditLikeCommunity.member.posts.comments.at(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // 9. Validate that voteScore reflects the upvote from member B
  TestValidator.equals("voteScore is 1", retrievedComment.voteScore, 1);
}
