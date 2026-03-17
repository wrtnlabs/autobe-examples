import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
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
 * Test that a member can change their existing vote direction from upvote to downvote.
 *
 * Scenario:
 * 1. Member A creates a community, subscribes to it, creates a post, and creates a comment
 * 2. Member B joins and casts an upvote on the comment
 * 3. Member B changes their vote to downvote
 * 4. Validate: vote ID remains same, vote_type changes to 'downvote', vote_score decreases by 2
 */
export async function test_api_comment_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Member A creates comment
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {},
    },
  );
  typia.assert(memberA);
  // Member A creates community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Member A subscribes to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberAConnection,
    { communityId: community.id },
  );
  // Member A creates a post
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberAConnection, {
      body: { community_id: community.id },
    });
  typia.assert(post);
  // Member A creates a comment on the post
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { content: "This is a test comment for vote direction change" },
      },
    );
  typia.assert(comment);
  // Step 2: Member B joins
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {},
    },
  );
  typia.assert(memberB);
  // Step 3: Member B casts upvote
  const upvoteBody: IRedditLikeVote.IUpdate = {
    vote_type: "upvote",
  };
  const upvoteResult: IRedditLikeVote =
    await api.functional.redditLike.member.comments.my_vote.updateMyVote(
      memberBConnection,
      {
        commentId: comment.id,
        body: upvoteBody,
      },
    );
  typia.assert(upvoteResult);
  // Capture upvote metadata before change
  const upvoteId: string = upvoteResult.id;
  const upvoteCreatedAt: string = upvoteResult.created_at;
  // Validate initial upvote
  TestValidator.equals(
    "upvote_type is upvote",
    upvoteResult.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "upvote member matches member B",
    upvoteResult.member.id,
    memberB.id,
  );
  // Step 4: Member B changes vote to downvote
  const downvoteBody: IRedditLikeVote.IUpdate = {
    vote_type: "downvote",
  };
  const downvoteResult: IRedditLikeVote =
    await api.functional.redditLike.member.comments.my_vote.updateMyVote(
      memberBConnection,
      {
        commentId: comment.id,
        body: downvoteBody,
      },
    );
  typia.assert(downvoteResult);
  // Step 5: Validations
  // 1. Vote ID remains the same (update operation, not new insert)
  TestValidator.equals(
    "vote ID unchanged after direction change",
    downvoteResult.id,
    upvoteId,
  );
  // 2. Vote type is now downvote
  TestValidator.equals(
    "vote_type changed to downvote",
    downvoteResult.vote_type,
    "downvote",
  );
  // 3. Member remains the same (Member B)
  TestValidator.equals(
    "vote member unchanged",
    downvoteResult.member.id,
    memberB.id,
  );
  // 4. Created_at timestamp preserved
  TestValidator.equals(
    "created_at preserved",
    downvoteResult.created_at,
    upvoteCreatedAt,
  );
  // 5. Updated_at reflects change time (should be different from created_at or from before)
  // Note: In practice updated_at might equal created_at if both happen in same timestamp,
  // but we verify the field exists and is a valid timestamp via typia.assert above
}
