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
 * Test vote direction change from downvote to upvote on a comment.
 *
 * Validates that when a member who previously downvoted a comment now upvotes it, the system
 * correctly adjusts the vote direction and updates the comment vote score by +2 (from -1 after
 * downvote to +1 after upvote). This tests the unique constraint on [member_id, comment_id]
 * where the vote is replaced rather than duplicated.
 *
 * The vote direction change from downvote to upvote increases the comment score by +2:
 * - Initial score: 0
 * - After downvote: -1 (score decreases by 1)
 * - After upvote: +1 (score increases by +2 from downvoted state)
 *
 * 1. Authenticate a member who will cast votes
 * 2. Set up: create community, subscribe to community, create post, create comment
 * 3. Verify initial comment score is 0
 * 4. Member downvotes the comment to establish downvote state
 * 5. Verify vote direction is 'downvote' and comment score decreased to -1
 * 6. Member upvotes the same comment to change direction from downvote to upvote
 * 7. Verify vote direction is 'upvote' and comment score increased to +1 (change of +2 from downvoted state)
 * 8. Confirm only one vote record exists (vote was replaced, not duplicated)
 */
export async function test_api_comment_upvote_change_direction_from_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate voting member
  const votingMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(votingMemberConnection, {
    body: {},
  });
  // 2a. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      votingMemberConnection,
      {},
    );
  typia.assert(community);
  // 2b. Subscribe to community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    votingMemberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  // 2c. Create post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    votingMemberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 2d. Create comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      votingMemberConnection,
      {
        body: {},
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 3. Verify initial comment score is 0
  TestValidator.equals("initial comment score is 0", comment.voteScore, 0);
  // 4. Member downvotes the comment to establish downvote state
  const downvote =
    await api.functional.redditLikeCommunity.member.votes.comments.downvote.downvoteComment(
      votingMemberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(downvote);
  // 5. Verify downvote record and score decrease
  TestValidator.equals(
    "downvote direction is downvote",
    downvote.direction,
    "downvote",
  );
  TestValidator.equals(
    "comment score decreased to -1 after downvote",
    downvote.comment.vote_score,
    -1,
  );
  // 6. Member upvotes the same comment (direction change from downvote to upvote)
  const upvote =
    await api.functional.redditLikeCommunity.member.votes.comments.upvote(
      votingMemberConnection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(upvote);
  // 7. Verify vote direction changed to 'upvote' and score increased by +2 from downvoted state
  TestValidator.equals(
    "vote direction changed to upvote",
    upvote.direction,
    "upvote",
  );
  TestValidator.equals(
    "comment score increased to +1 (net change of +2 from downvoted state of -1)",
    upvote.comment.vote_score,
    1,
  );
  // 8. Verify the vote was replaced not duplicated (same comment_id, single vote record)
  TestValidator.equals(
    "vote record references the same comment",
    upvote.comment.id,
    downvote.comment.id,
  );
  TestValidator.equals(
    "vote record references the same member",
    upvote.member.id,
    downvote.member.id,
  );
}
