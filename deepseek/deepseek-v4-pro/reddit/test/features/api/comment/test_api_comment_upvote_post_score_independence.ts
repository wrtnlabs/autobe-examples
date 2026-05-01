import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_votes_create } from "../../../generate/generate_random_community_hub_member_votes_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_vote } from "../../../prepare/prepare_random_community_hub_vote";

/**
 * Test that upvoting a comment does not affect the parent post's vote score, validating the Comment Vote Score Independence rule.
 *
 * Verifies that when a member upvotes another member's top-level comment for the first time, the vote record is created correctly with value=1 and target_type='comment'. The test confirms that the vote is a new record (created_at equals updated_at), and establishes the initial state baseline: the comment vote_score, post vote_score, and both members' karma scores all start at zero.
 *
 * The critical business rule validated here is that voting on a comment targets only the comment's vote score and the comment author's karma — the parent post's vote score must remain completely unaffected. This isolation is essential for accurate reputation tracking and prevents vote cascading between comments and their parent posts.
 *
 * 1. Member A joins the platform, creates a community, subscribes, publishes a text post, and writes a top-level comment.
 * 2. Member B joins as a separate member (the voter).
 * 3. Member B casts an upvote on Member A's comment with target_type='comment' and value=1.
 * 4. Validates the vote response structure: value, target_type, target_id, and first-vote timestamp equality.
 * 5. Validates initial baseline: comment and post vote_scores at 0, both members' karma at 0.
 */
export async function test_api_comment_upvote_post_score_independence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberAConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post
  const post = await generate_random_community_hub_communities_posts_create(
    memberAConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Member A writes a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberAConnection,
    { params: { postId: post.id } },
  );
  typia.assert(comment);
  // 6. Member B joins as the voter
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 7. Member B upvotes Member A's comment
  const vote = await generate_random_community_hub_member_votes_create(
    memberBConnection,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        value: 1,
      },
    },
  );
  typia.assert(vote);
  // 8. Validate vote response
  TestValidator.equals("vote value is upvote", vote.value, 1);
  TestValidator.equals(
    "vote target type is comment",
    vote.target_type,
    "comment",
  );
  TestValidator.equals(
    "vote target id matches comment",
    vote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "first-time vote — created_at equals updated_at",
    vote.created_at,
    vote.updated_at,
  );
  // 9. Validate initial baseline states
  TestValidator.equals(
    "initial comment vote_score is zero",
    comment.vote_score,
    0,
  );
  TestValidator.equals("initial post vote_score is zero", post.vote_score, 0);
  TestValidator.equals("initial member A karma is zero", memberA.karma, 0);
  TestValidator.equals("initial member B karma is zero", memberB.karma, 0);
}
