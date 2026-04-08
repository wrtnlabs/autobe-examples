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
 * Test comment vote aggregation across multiple members.
 *
 * Validates the complete voting workflow where three different members cast votes on the same comment. Member A (community owner) creates the infrastructure (community, post, comment) and casts the first upvote. Member B and Member C then independently vote on the same comment - B upvotes and C downvotes. The test verifies that vote score aggregation works correctly across multiple voters, resulting in a final score of +1 (two upvotes minus one downvote).
 *
 * Special attention is given to ensuring each member can cast exactly one vote, vote records maintain correct member associations, and the computed vote_score reflects the sum of all individual votes. This validates the core voting mechanics of the Reddit-style community platform.
 *
 * 1. Member A joins, creates community, subscribes, creates post, creates comment.
 * 2. Member A casts upvote (+1) on their own comment.
 * 3. Member B joins and casts upvote (+1) on the same comment.
 * 4. Member C joins and casts downvote (-1) on the same comment.
 * 5. Validates vote score equals 1 and each vote record has correct member reference.
 */
export async function test_api_comment_vote_multiple_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup - community owner and first voter
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberA);
  // Create community owned by member A
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(community);
  // Subscribe member A to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberAConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Create a top-level comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 2. Member A casts upvote (+1) on the comment
  const voteA =
    await generate_random_reddit_community_member_comments_votes_create(
      memberAConnection,
      {
        params: { commentId: comment.id },
        body: { value: 1 },
      },
    );
  typia.assert(voteA);
  // 3. Member B setup and upvote
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberB);
  const voteB =
    await generate_random_reddit_community_member_comments_votes_create(
      memberBConnection,
      {
        params: { commentId: comment.id },
        body: { value: 1 },
      },
    );
  typia.assert(voteB);
  // 4. Member C setup and downvote
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberC);
  const voteC =
    await generate_random_reddit_community_member_comments_votes_create(
      memberCConnection,
      {
        params: { commentId: comment.id },
        body: { value: -1 },
      },
    );
  typia.assert(voteC);
  // 5. Validate vote records
  TestValidator.equals("Member A vote value", voteA.value, 1);
  TestValidator.equals("Member B vote value", voteB.value, 1);
  TestValidator.equals("Member C vote value", voteC.value, -1);
  TestValidator.notEquals(
    "Member A vote ID differs from B",
    voteA.id,
    voteB.id,
  );
  TestValidator.notEquals(
    "Member A vote ID differs from C",
    voteA.id,
    voteC.id,
  );
  TestValidator.notEquals(
    "Member B vote ID differs from C",
    voteB.id,
    voteC.id,
  );
  TestValidator.equals(
    "Member A username in vote",
    voteA.member.username,
    memberA.username,
  );
  TestValidator.equals(
    "Member B username in vote",
    voteB.member.username,
    memberB.username,
  );
  TestValidator.equals(
    "Member C username in vote",
    voteC.member.username,
    memberC.username,
  );
}
