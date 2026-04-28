import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test idempotent behavior of vote removal when no vote exists.
 *
 * Validates that removing a non-existent vote on a post succeeds without error and returns the post state unchanged. Authenticated voter member calls the remove endpoint on a post they have never voted on. Since no vote record exists for this member-post combination, the operation is idempotent and completes successfully.
 *
 * Special attention is given to verifying that the vote score remains unaffected when removing a vote that was never cast, confirming that no score adjustments occur in the idempotent path.
 *
 * 1. Author member registers and authenticates.
 * 2. Author creates a community and subscribes to it.
 * 3. Author creates a post in the community, establishing baseline vote score of zero.
 * 4. Voter member registers and authenticates separately from the author.
 * 5. Voter calls remove vote endpoint on the post they have never voted on.
 * 6. Validates the operation succeeds without error (idempotent behavior).
 * 7. Validates the returned post state matches baseline: vote_score remains unchanged.
 */
export async function test_api_post_vote_removal_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorEmail = typia.random<string & tags.Format<"email">>();
  await authorize_member_join(authorConnection, {
    body: {
      email: authorEmail,
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to community to enable post creation
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 4. Create post - capture initial vote score (baseline is 0 for new post)
  const post = await generate_random_reddit_like_community_member_posts_create(
    authorConnection,
    { body: { community_id: community.id, post_type: "text" } },
  );
  typia.assert(post);
  const initialVoteScore = post.vote_score;
  // 5. Register voter member - a different user who has not voted on the post
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password456!",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    },
  });
  // 6. Voter removes their vote - idempotent since no vote was ever cast
  const removedPost =
    await api.functional.redditLikeCommunity.member.votes.posts.remove(
      voterConnection,
      { postId: post.id },
    );
  typia.assert(removedPost);
  // 7. Validate the operation succeeded and post state is unchanged
  TestValidator.equals(
    "idempotent remove returns correct post",
    removedPost.id,
    post.id,
  );
  TestValidator.equals(
    "vote score unchanged after idempotent remove",
    removedPost.vote_score,
    initialVoteScore,
  );
}
