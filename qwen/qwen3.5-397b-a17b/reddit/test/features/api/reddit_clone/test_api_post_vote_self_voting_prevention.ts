import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test the business rule that prevents members from voting on their own posts.
 *
 * Test Steps:
 * 1. Create a single member account using authorize_member_join utility
 * 2. As the member: create a community using generate_random_reddit_clone_communities_create
 * 3. As the member: subscribe to the community using generate_random_reddit_clone_member_subscriptions_create
 * 4. As the member: create a text post using generate_random_reddit_clone_member_posts_create
 * 5. As the same member: attempt to cast an UPVOTE on their own post using SDK function
 *
 * Validation Points:
 * - Vote operation fails with an appropriate error response (business logic rejection)
 * - Error message indicates self-voting is not allowed
 * - Post vote score remains at 0 (no votes cast)
 * - Member's karma score remains unchanged
 *
 * This scenario validates the self-voting prevention rule: the system must reject
 * attempts by users to vote on their own content, ensuring vote integrity and
 * preventing karma manipulation.
 */
export async function test_api_post_vote_self_voting_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and establish authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // Capture initial karma score
  const initialKarmaScore = memberAuth.karma_score.score;
  // 2. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // Verify post author is the member
  TestValidator.equals(
    "post author is the member",
    post.author.id,
    memberAuth.id,
  );
  // Verify initial vote score is 0
  TestValidator.equals("initial vote score is 0", post.vote_score, 0);
  // 5. Attempt to vote on own post - should fail with business logic error
  await TestValidator.error("self-voting should be rejected", async () => {
    await api.functional.redditClone.member.posts._vote.update(
      memberConnection,
      {
        postId: post.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.IUpdate,
      },
    );
  });
  // Note: We cannot directly verify no vote record was created or karma unchanged
  // without additional GET endpoints. The error test validates the business rule.
}
