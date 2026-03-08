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
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_post_vote_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member signup
  const joinConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(joinConnection, {
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
  typia.assert(memberResponse);
  // 2. Create community (use authenticated connection from signup)
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = { Authorization: memberResponse.token.access };
  const community =
    await api.functional.redditPlatform.member.communities.create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in community
  const post = await api.functional.redditPlatform.member.posts.create(
    communityConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Cast vote on post
  const voteInput = {
    post_id: post.id,
    vote_type: "UPVOTE" as const,
  } satisfies IRedditPlatformPostVote.ICreate;
  const vote = await api.functional.redditPlatform.member.post_votes.cast(
    communityConnection,
    { body: voteInput },
  );
  typia.assert(vote);
  // 5. Retrieve vote by ID
  const retrievedVote = await api.functional.redditPlatform.post_votes.at(
    communityConnection,
    { voteId: vote.id },
  );
  typia.assert(retrievedVote);
  // 6. Validate response
  TestValidator.equals("vote_type matches", retrievedVote.vote_type, "UPVOTE");
  TestValidator.equals(
    "author matches member",
    retrievedVote.author.id,
    memberResponse.id,
  );
  TestValidator.equals(
    "post matches voted post",
    retrievedVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "post title matches",
    retrievedVote.post.title,
    post.title,
  );
  TestValidator.equals(
    "vote created_at is valid datetime",
    typeof retrievedVote.created_at,
    "string",
  );
  TestValidator.equals(
    "vote updated_at is valid datetime",
    typeof retrievedVote.updated_at,
    "string",
  );
  TestValidator.equals("deleted_at is null", retrievedVote.deleted_at, null);
}
