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
 * Test the edge case where a member changes their existing vote from UPVOTE to DOWNVOTE on a post.
 *
 * Test Steps:
 * 1. Create two member accounts: voter and post author
 * 2. As post author: create a community and subscribe to it
 * 3. As post author: create a text post in the community
 * 4. As voter: subscribe to the community
 * 5. As voter: cast an initial UPVOTE on the post
 * 6. As voter: change vote to DOWNVOTE by calling the PUT endpoint with vote_type='DOWNVOTE'
 *
 * Validation Points:
 * - Second vote operation succeeds and updates the existing vote record
 * - Returned vote record shows vote_type='DOWNVOTE' (updated value)
 * - The vote record's updated_at timestamp is newer than created_at
 * - No duplicate vote records exist (same vote ID, still only one vote per voter per post)
 * - Vote member reference matches the voter
 */
export async function test_api_post_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create post author account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorJoin = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorJoin);
  // 2. Create voter account
  const voterConnection: api.IConnection = { host: connection.host };
  const voterJoin = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voterJoin);
  // 3. Post author creates a community
  const community = await generate_random_reddit_clone_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Post author subscribes to their own community
  const authorSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 5. Post author creates a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
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
  // 6. Voter subscribes to the community
  const voterSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(voterSubscription);
  // 7. Voter casts initial UPVOTE on the post
  const initialVote = await generate_random_reddit_clone_member_posts_vote(
    voterConnection,
    {
      body: {
        vote_type: "UPVOTE",
      },
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(initialVote);
  // Validate initial vote
  TestValidator.equals("initial vote type", initialVote.vote_type, "UPVOTE");
  const initialVoteCreatedAt = initialVote.created_at;
  const initialVoteId = initialVote.id;
  // 8. Voter changes vote to DOWNVOTE using PUT endpoint
  const updatedVote =
    await api.functional.redditClone.member.posts._vote.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditCloneVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 9. Validate vote change results
  TestValidator.equals(
    "updated vote type is DOWNVOTE",
    updatedVote.vote_type,
    "DOWNVOTE",
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedVote.updated_at).getTime() >
      new Date(updatedVote.created_at).getTime(),
  );
  TestValidator.equals(
    "vote id remains same (same record updated)",
    updatedVote.id,
    initialVoteId,
  );
  TestValidator.equals(
    "vote member matches voter",
    updatedVote.member.id,
    voterJoin.id,
  );
  TestValidator.equals(
    "vote created_at unchanged",
    updatedVote.created_at,
    initialVoteCreatedAt,
  );
}
