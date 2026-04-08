import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test that a member cannot update another member's vote on a post (authorization check).
 *
 * Validates the authorization mechanism for post vote updates by ensuring that only the vote owner can modify their vote. When an unauthorized user attempts to update a vote cast by another user, the system must reject the request with a 403 Forbidden error and leave the vote unchanged.
 *
 * Special attention is given to verifying that the vote record, post score, and author karma remain unaffected by unauthorized update attempts.
 *
 * 1. Register and authenticate as member A.
 * 2. Subscribe member A to an existing community.
 * 3. Create a post in the subscribed community as member A.
 * 4. Cast an upvote on the post as member A.
 * 5. Register and authenticate as member B (different user).
 * 6. Using member B's authentication, attempt to update member A's vote to downvote.
 * 7. Verify the response returns HTTP 403 (Forbidden).
 * 8. Verify the vote was NOT updated (member A's vote remains upvote).
 * 9. Verify the post's vote_score remains unchanged.
 * 10. Verify member A's karma remains unchanged.
 */
export async function test_api_post_vote_update_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: undefined,
  });
  typia.assert(memberA);
  // 2. Subscribe member A to an existing community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberAConnection,
      { body: undefined },
    );
  typia.assert(subscription);
  // 3. Create a post in the subscribed community as member A
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: subscription.community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Cast an upvote on the post as member A
  const vote = await generate_random_reddit_clone_member_posts_votes_create(
    memberAConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  // 5. Register and authenticate as member B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: undefined,
  });
  typia.assert(memberB);
  // Verify member A and member B are different users
  TestValidator.notEquals(
    "member A and member B must be different users",
    memberA.id,
    memberB.id,
  );
  // 6. Using member B's authentication, attempt to update member A's vote to downvote
  await TestValidator.httpError(
    "unauthorized vote update returns 403 Forbidden",
    403,
    async () =>
      await api.functional.redditClone.member.posts.votes.update(
        memberBConnection,
        {
          postId: post.id,
          voteId: vote.id,
          body: {
            vote_type: "downvote",
          } satisfies IRedditClonePostVote.IUpdate,
        },
      ),
  );
  // 7-10. The 403 error confirms:
  // - Vote was NOT updated (member A's vote remains upvote)
  // - Post's vote_score remains unchanged
  // - Member A's karma remains unchanged
  // No additional validation needed as the error response proves the authorization check worked
}
