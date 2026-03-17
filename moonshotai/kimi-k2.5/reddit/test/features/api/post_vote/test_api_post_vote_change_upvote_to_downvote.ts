import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_member_posts_votes_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_vote } from "../../../prepare/prepare_random_reddit_like_vote";

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP: Member A (Post Author) ===
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(author);
  // Create community as Member A
  const community = await generate_random_reddit_like_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Subscribe Member A to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    authorConnection,
    { communityId: community.id },
  );
  // Create post as Member A
  const post = await generate_random_reddit_like_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // === SETUP: Member B (Voter) ===
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(voter);
  // Subscribe Member B to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    voterConnection,
    { communityId: community.id },
  );
  // === TEST: Cast initial upvote ===
  const upvote = await generate_random_reddit_like_member_posts_votes_create(
    voterConnection,
    {
      body: { vote_type: "upvote" } satisfies IRedditLikeVote.ICreate,
      params: { postId: post.id },
    },
  );
  typia.assert(upvote);
  // Validate initial upvote state
  TestValidator.equals("upvote has correct type", upvote.vote_type, "upvote");
  TestValidator.equals(
    "upvote member matches voter",
    upvote.member.id,
    voter.id,
  );
  // === TEST: Change vote from upvote to downvote via PUT endpoint ===
  const downvote = await api.functional.redditLike.member.posts.my_vote.update(
    voterConnection,
    {
      postId: post.id,
      body: { vote_type: "downvote" } satisfies IRedditLikeVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // === VALIDATE: Vote changed correctly ===
  TestValidator.equals(
    "vote type changed to downvote",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote member still matches voter",
    downvote.member.id,
    voter.id,
  );
  // Verify updated_at timestamp is newer than created_at (vote was updated)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(downvote.updated_at) > new Date(downvote.created_at),
  );
}
