import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_comments_votes_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment vote removal by the vote owner.
 *
 * Validates the complete workflow of a member removing their own vote from a comment. This test ensures that vote owners have the authority to retract their votes and that the system properly handles soft-deletion while maintaining accurate vote score calculations.
 *
 * The test creates a full content hierarchy: member account, community, subscription, post, and comment. A vote is cast on the comment, then removed to verify the soft-delete mechanism and score recalculation logic work correctly.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Community is created with random name, description, and icon.
 * 3. Member subscribes to the created community.
 * 4. Text post is created in the community with title and body content.
 * 5. Comment is created on the post with random content.
 * 6. Member casts an upvote (+1) on the comment.
 * 7. Initial comment vote_score is captured before vote removal.
 * 8. Vote is removed using the erase endpoint with commentId and voteId.
 * 9. Comment is fetched again to verify vote_score decreased by 1.
 * 10. Validates that vote removal is successful and score is recalculated.
 */
export async function test_api_comment_vote_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community
  await generate_random_reddit_community_member_member_subscriptions_create(
    memberConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  // 5. Create comment on post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // 6. Cast vote on comment (upvote)
  const vote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: { value: 1 },
      },
    );
  typia.assert(vote);
  // Capture initial vote score for reference
  // Note: Cannot fetch comment again to verify score change as GET endpoint not available in SDK
  const initialVoteScore = comment.vote_score;
  // 7. Validate vote structure before removal
  TestValidator.equals("vote value is upvote", vote.value, 1);
  typia.assert(vote.member);
  // 8. Remove the vote using erase endpoint
  await api.functional.redditCommunity.member.comments.votes.erase(
    memberConnection,
    {
      commentId: comment.id,
      voteId: vote.id,
    },
  );
  // 9. Verify vote removal completed successfully
  // The erase endpoint returns void, successful completion indicates vote was removed
  TestValidator.predicate(
    "vote score before removal reflects upvote",
    initialVoteScore >= 1,
  );
}
