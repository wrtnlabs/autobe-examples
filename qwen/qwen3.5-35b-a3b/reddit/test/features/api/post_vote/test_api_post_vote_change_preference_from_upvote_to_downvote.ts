import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_change_preference_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member authentication via join (returns IAuthorized with tokens)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create community using the authenticated member
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to the community we just created
  const subscribeResult =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
        params: { communityId: community.id },
      },
    );
  typia.assert(subscribeResult);
  // Step 4: Create post in the subscribed community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Cast initial UPVOTE
  const upvote = await generate_random_reddit_platform_member_post_votes_cast(
    memberConnection,
    {
      body: {
        post_id: post.id,
        vote_type: "UPVOTE",
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  typia.assert(upvote);
  // Verify upvote was recorded with correct type
  TestValidator.equals("upvote type", upvote.vote_type, "UPVOTE");
  // Verify post vote_score is +1 after upvote (from upvote response's post field)
  TestValidator.equals(
    "post vote_score after upvote",
    upvote.post.vote_score,
    1,
  );
  // Verify author karma is +1 after upvote (from upvote response's post.author)
  TestValidator.equals(
    "author karma after upvote",
    upvote.post.author.karmaScore,
    1,
  );
  // Step 6: Change vote from UPVOTE to DOWNVOTE
  const downvote = await generate_random_reddit_platform_member_post_votes_cast(
    memberConnection,
    {
      body: {
        post_id: post.id,
        vote_type: "DOWNVOTE",
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  typia.assert(downvote);
  // Verify vote record has vote_type DOWNVOTE
  TestValidator.equals(
    "vote type changed to downvote",
    downvote.vote_type,
    "DOWNVOTE",
  );
  // Verify post vote_score is -1 after downvote (changed from +1 to -1, delta = -2)
  TestValidator.equals(
    "post vote_score after downvote",
    downvote.post.vote_score,
    -1,
  );
  // Verify author's karma is -1 after downvote (changed from +1 to -1, delta = -2)
  TestValidator.equals(
    "author karma after downvote",
    downvote.post.author.karmaScore,
    -1,
  );
  // Verify vote record timestamps reflect the change
  const voteCreated = new Date(downvote.created_at);
  const voteUpdated = new Date(downvote.updated_at);
  TestValidator.predicate(
    "vote updated_at >= created_at",
    voteUpdated >= voteCreated,
  );
}
