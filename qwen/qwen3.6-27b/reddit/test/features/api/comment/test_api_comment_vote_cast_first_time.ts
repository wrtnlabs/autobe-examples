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
import { generate_random_reddit_like_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_like_community_member_comments_votes_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_comment_vote } from "../../../prepare/prepare_random_reddit_like_community_comment_vote";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Test member casting first upvote on a comment with no prior vote.
 *
 * Validates the complete comment voting workflow including member registration, community setup, post creation, comment creation, and vote casting. Ensures that the vote record is correctly created with the specified direction and that the comment's vote score reflects the new upvote.
 *
 * Special attention is given to verifying that the vote record contains the correct member and comment references, and that the comment's vote_score increases from 0 to 1 as expected for the first upvote.
 *
 * 1. Member registers with email, password, and username.
 * 2. Member creates a community.
 * 3. Member subscribes to the community.
 * 4. Member creates a text post in the community.
 * 5. Member creates a comment on the post.
 * 6. Member casts an upvote on the comment.
 * 7. Validates vote record: correct id, member reference, comment reference, direction set to 'upvote', timestamps set.
 * 8. Validates comment's vote_score reflects the new upvote (increased to 1).
 */
export async function test_api_comment_vote_cast_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  const authenticatedMember =
    typia.assert<IREdditLikeCommunityMember.IAuthorized>(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert<IREdditLikeCommunityCommunity>(community);
  // 3. Subscribe to community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies IRedditLikeCommunityCommunitySubscription.ICreate;
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: subscriptionBody },
    );
  typia.assert<IRedditLikeCommunityCommunitySubscription>(subscription);
  // 4. Create post
  const postBody = {
    community_id: community.id,
  } satisfies DeepPartial<IREdditLikeCommunityPost.ICreate>;
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    { body: postBody },
  );
  typia.assert<IREdditLikeCommunityPost>(post);
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        body: undefined,
        params: { postId: post.id },
      },
    );
  typia.assert<IRedditLikeCommunityPostComment>(comment);
  const initialVoteScore: number = comment.voteScore;
  // 6. Cast first upvote on comment
  const voteDirection = "upvote" as const;
  const voteBody = {
    direction: voteDirection,
  } satisfies IRedditLikeCommunityCommentVote.ICreate;
  const vote =
    await generate_random_reddit_like_community_member_comments_votes_create(
      memberConnection,
      {
        body: voteBody,
        params: { commentId: comment.id },
      },
    );
  // 7. Validate vote response structure
  const validatedVote = typia.assert<IRedditLikeCommunityCommentVote>(vote);
  const validatedCommentSummary =
    typia.assert<IREdditLikeCommunityComment.ISummary>(vote.comment);
  // 8. Validate vote record details
  TestValidator.equals(
    "vote direction is upvote",
    validatedVote.direction,
    voteDirection,
  );
  TestValidator.equals(
    "vote member matches authenticated member",
    validatedVote.member.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "vote comment matches created comment",
    validatedVote.comment.id,
    comment.id,
  );
  // 9. Validate timestamps are present
  TestValidator.predicate(
    "vote has created_at timestamp",
    () =>
      typeof validatedVote.created_at === "string" &&
      validatedVote.created_at.length > 0,
  );
  TestValidator.equals(
    "vote has updated_at timestamp",
    typeof validatedVote.updated_at === "string",
    true,
  );
  // 10. Validate comment vote_score increased from 0 to 1
  TestValidator.equals("initial comment had 0 votes", initialVoteScore, 0);
  TestValidator.equals(
    "comment vote_score increased to 1 after upvote",
    validatedCommentSummary.vote_score,
    1,
  );
}
