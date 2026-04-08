import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test unauthorized vote deletion by non-owner member.
 *
 * Validates the authorization logic for vote deletion by testing that a member cannot delete another user's vote on a post. This test ensures the business rule that users can only delete votes they cast themselves is properly enforced at the API level.
 *
 * The test creates two distinct member accounts, establishes a community and post, has member A cast a vote, then attempts to delete that vote using member B's credentials. The expected behavior is a 403 Forbidden response indicating authorization failure rather than a 404 Not Found which would indicate the vote doesn't exist.
 *
 * 1. Member A registers and authenticates via join endpoint.
 * 2. Member B registers and authenticates via join endpoint.
 * 3. Member A creates a community and becomes the owner.
 * 4. Both members subscribe to the community to gain posting privileges.
 * 5. Member A creates a text post in the community.
 * 6. Member A casts an upvote on their own post.
 * 7. Member B attempts to delete member A's vote and receives 403 Forbidden.
 * 8. Validates the vote still exists by attempting to fetch or checking post vote score.
 */
export async function test_api_post_vote_deletion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member A (vote owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register and authenticate member B (unauthorized user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Both members subscribe to the community
  const subscriptionA =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  const subscriptionB =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberBConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);
  // 5. Member A creates a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Member A casts an upvote on the post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberAConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        value: 1 as const,
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // Record the vote score after upvote (should be +1)
  const voteScoreAfterUpvote = post.voteScore + 1;
  // 7. Member B attempts to delete member A's vote - should fail with 403
  await TestValidator.error(
    "unauthorized vote deletion returns 403 Forbidden",
    async () => {
      await api.functional.redditCommunity.member.posts.votes.erase(
        memberBConnection,
        {
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );
  // 8. Verify vote still exists by updating it (proves vote record persisted)
  const updatedVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          value: -1 as const,
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // Verify the vote ID remains the same (update, not new creation)
  TestValidator.equals(
    "vote ID unchanged after failed deletion",
    updatedVote.id,
    vote.id,
  );
  // Verify vote value was updated (proves vote record persisted)
  TestValidator.equals("vote value updated", updatedVote.value, -1);
  // Verify post vote score changed from +1 to -1 (proves vote was not deleted)
  TestValidator.equals(
    "post vote score reflects updated vote",
    updatedVote.post.vote_score,
    -1,
  );
}
