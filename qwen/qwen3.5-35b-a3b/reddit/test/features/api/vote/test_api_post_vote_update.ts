import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_post_vote_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member account creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(2),
      href: "https://test.example.com/join",
      referrer: "https://test.example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe member to a community
  const community = typia.random<IRedditCommunityCommunity.ISummary>();
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  if (subscription.status !== "active")
    throw new Error("Subscription should be active");
  typia.assert(subscription.community);
  // 3. Create a post in the subscribed community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "text",
        reddit_community_community_id: subscription.community.id,
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  if (post.vote_score !== 0)
    throw new Error("Initial post vote_score should be 0");
  typia.assert(post.community);
  // 4. Cast initial upvote
  const initialVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(initialVote);
  typia.assert(initialVote.post);
  // 5. Verify initial vote was created correctly
  TestValidator.equals("initial vote type", initialVote.vote_type, "upvote");
  TestValidator.equals(
    "post vote_score after upvote",
    initialVote.post.vote_score,
    1,
  );
  const initialUpdatedAt = initialVote.updated_at;
  typia.assert(initialVote.author);
  typia.assert(initialVote.post.author);
  // 6. Cast downvote to update existing vote
  const updatedAtBeforeUpdate = new Date();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const updatedVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(updatedVote);
  typia.assert(updatedVote.post);
  // 7. Verify vote record was updated (same id, updated_at changed)
  TestValidator.equals("vote id unchanged", updatedVote.id, initialVote.id);
  TestValidator.equals(
    "vote type updated to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedVote.updated_at,
    initialUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after update",
    new Date(updatedVote.updated_at) > updatedAtBeforeUpdate,
  );
  typia.assert(updatedVote.author);
  typia.assert(updatedVote.post.author);
  // 8. Verify post vote_score decreased by 2 (from 1 to -1)
  TestValidator.equals(
    "post vote_score after downvote",
    updatedVote.post.vote_score,
    -1,
  );
}
