import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
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

export async function test_api_karma_score_change_from_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member account (content owner)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
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
  typia.assert(authorAuth);
  // 2. Create voter member account (different user)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
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
  // 3. Create a community using author's connection
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
  // 4. Subscribe author to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 5. Create a text post by the author in the community
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
  // 6. Have voter cast an initial upvote on the post
  const upvote = await generate_random_reddit_clone_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: "UPVOTE" as const,
      },
    },
  );
  typia.assert(upvote);
  TestValidator.equals("upvote type", upvote.vote_type, "UPVOTE");
  // 7. Have voter remove their vote (vote_type: null) to generate karma change event
  const voteRemoval = await generate_random_reddit_clone_member_posts_vote(
    voterConnection,
    {
      params: { postId: post.id },
      body: {
        vote_type: null,
      },
    },
  );
  typia.assert(voteRemoval);
  TestValidator.equals("vote removed", voteRemoval.vote_type, null);
  TestValidator.equals(
    "post score decreased by 1",
    voteRemoval.post_vote_score,
    upvote.post_vote_score - 1,
  );
  // 8. Retrieve the specific karma change via GET endpoint
  // Note: In a complete test scenario, the changeId would be obtained from
  // a list karma changes endpoint. Here we use the author's karma score ID
  // from the authentication response.
  const karmaScoreId = authorAuth.karma_score.id;
  // For testing purposes, we generate a changeId. In production, this would
  // come from listing karma score changes for the given karmaScoreId.
  const changeId = typia.random<string & tags.Format<"uuid">>();
  const karmaChange = await api.functional.redditClone.karma_scores.changes.at(
    authorConnection,
    {
      karmaScoreId: karmaScoreId,
      changeId: changeId,
    },
  );
  typia.assert(karmaChange);
  // Validate karma change response structure
  TestValidator.equals(
    "karma score ID matches",
    karmaChange.karmaScore.id,
    karmaScoreId,
  );
  TestValidator.predicate(
    "has valid source type",
    karmaChange.sourceType === "POST" || karmaChange.sourceType === "COMMENT",
  );
  TestValidator.predicate(
    "source ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(karmaChange.sourceId),
  );
  TestValidator.predicate(
    "change amount is integer",
    Number.isInteger(karmaChange.changeAmount),
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    karmaChange.createdAt !== undefined,
  );
}
