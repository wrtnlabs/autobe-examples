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
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_posts_vote } from "../../../generate/generate_random_reddit_clone_member_posts_vote";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that a user's karma score correctly reflects positive karma from upvotes received on their posts.
 *
 * Setup: Create a target member account, create a community, subscribe to the community,
 * create a post as the target member. Then create another member account, have that member
 * upvote the post. Verify the target member's karma score increases from 0 to 1.
 *
 * This validates the business rule that upvotes increase the content creator's karma by exactly 1 per upvote.
 */
export async function test_api_karma_score_positive_from_upvotes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target member whose karma will be tested
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
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
  typia.assert(targetMember);
  // 2. Verify initial karma score is 0
  const initialKarma = await api.functional.redditClone.karma_scores.at(
    targetMemberConnection,
    {
      memberId: targetMember.id,
    },
  );
  typia.assert(initialKarma);
  TestValidator.equals("initial karma score", initialKarma.score, 0);
  // 3. Create a community
  const community = await generate_random_reddit_clone_communities_create(
    targetMemberConnection,
    {},
  );
  typia.assert(community);
  // 4. Subscribe to the community (already subscribed as creator, but ensure)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      targetMemberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Create a post as the target member
  const post = await generate_random_reddit_clone_member_posts_create(
    targetMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditClonePostText.ICreate,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create another member to cast upvote
  const voterMemberConnection: api.IConnection = { host: connection.host };
  const voterMember = await authorize_member_join(voterMemberConnection, {
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
  typia.assert(voterMember);
  // 7. Voter subscribes to the community
  const voterSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterMemberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // 8. Voter upvotes the post
  const vote = await generate_random_reddit_clone_member_posts_vote(
    voterMemberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "UPVOTE",
      } satisfies IRedditClonePostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 9. Verify target member's karma score increased to 1
  const updatedKarma = await api.functional.redditClone.karma_scores.at(
    targetMemberConnection,
    {
      memberId: targetMember.id,
    },
  );
  typia.assert(updatedKarma);
  TestValidator.equals("karma score after upvote", updatedKarma.score, 1);
  TestValidator.predicate(
    "karma increased",
    updatedKarma.score > initialKarma.score,
  );
}
