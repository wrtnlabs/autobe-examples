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

export async function test_api_post_vote_removal_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create post author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(author);
  // 3. Create community owned by the post author
  const community = await generate_random_reddit_clone_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 4. Subscribe voter to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Create a text post in the community as the post author
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT" as const,
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // Store initial karma score
  const initialKarmaScore = author.karma_score.score;
  // 6. Cast a DOWNVOTE on the post as the voter
  const downvote = await generate_random_reddit_clone_member_posts_vote(
    voterConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "DOWNVOTE" as const,
      },
    },
  );
  typia.assert(downvote);
  // 7. Verify the post vote score is -1
  TestValidator.equals(
    "post vote score after downvote",
    downvote.post_vote_score,
    -1,
  );
  // 8. Verify the author's karma decreased by 1 from the downvote
  TestValidator.equals(
    "author karma after downvote",
    author.karma_score.score,
    initialKarmaScore - 1,
  );
  // 9. Remove the vote via DELETE endpoint (returns void, 204 No Content)
  await api.functional.redditClone.member.posts._vote.erase(voterConnection, {
    postId: post.id,
  });
  // 10. Cast an UPVOTE on the same post to verify vote score recalculates correctly
  // If downvote was properly removed, upvote should bring score from 0 to +1
  const upvote = await generate_random_reddit_clone_member_posts_vote(
    voterConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        vote_type: "UPVOTE" as const,
      },
    },
  );
  typia.assert(upvote);
  // 11. Verify the post vote score is now +1 (proving downvote was removed)
  TestValidator.equals(
    "post vote score after upvote",
    upvote.post_vote_score,
    1,
  );
  // 12. Verify the vote type is UPVOTE
  TestValidator.equals("vote type is upvote", upvote.vote_type, "UPVOTE");
  // 13. Verify the author's karma increased back after vote removal and upvote
  // Downvote removed: karma +1, Upvote added: karma +1, net change from initial: +1
  TestValidator.equals(
    "author karma after vote change",
    author.karma_score.score,
    initialKarmaScore + 1,
  );
}
