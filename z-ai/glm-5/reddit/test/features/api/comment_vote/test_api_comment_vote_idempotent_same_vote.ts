import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that sending the same vote type twice is idempotent (no-op) and does not
 * duplicate votes or affect karma twice.
 *
 * **Setup:**
 * - Create a community
 * - Create a comment author who subscribes to the community
 * - The comment author creates a post and a comment
 * - Create a voter who will cast the same vote twice
 *
 * **Test Execution:**
 * 1. Voter casts first upvote on the comment
 * 2. Voter casts the same upvote again (idempotent test)
 *
 * **Validation Points:**
 * - Second identical vote request is idempotent
 * - Comment score remains unchanged on duplicate vote
 * - Author karma is not affected twice
 * - Single vote constraint is maintained
 */
export async function test_api_comment_vote_idempotent_same_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register comment author (Member 1)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Create a community where the comment will be posted
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  // 3. Register the voter who will cast the same vote twice (Member 2)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 4. Comment author subscribes to the community (required for posting)
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 5. Comment author creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    { body: { communityId: community.id } },
  );
  // 6. Comment author creates the target comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      { params: { postId: post.id } },
    );
  // Record author's karma before voting (includes post self-upvote karma)
  const karmaBeforeVote = comment.author.karma;
  // 7. Voter casts first upvote
  const firstVoteResult =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: { voteType: "upvote" } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(firstVoteResult);
  // 8. Verify first vote increased comment score to 1
  TestValidator.equals(
    "comment score after first vote",
    firstVoteResult.score,
    1,
  );
  // 9. Verify author karma increased by 1
  TestValidator.equals(
    "author karma after first vote",
    firstVoteResult.author.karma,
    karmaBeforeVote + 1,
  );
  // 10. Voter casts same vote again (idempotent test)
  const secondVoteResult =
    await api.functional.communityPlatform.member.comments.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: { voteType: "upvote" } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(secondVoteResult);
  // 11. Verify second vote is idempotent - score unchanged
  TestValidator.equals(
    "comment score after duplicate vote",
    secondVoteResult.score,
    1,
  );
  // 12. Verify author karma not affected twice
  TestValidator.equals(
    "author karma after duplicate vote",
    secondVoteResult.author.karma,
    karmaBeforeVote + 1,
  );
  // 13. Verify comment IDs match (same comment)
  TestValidator.equals(
    "comment IDs match",
    secondVoteResult.id,
    firstVoteResult.id,
  );
}
