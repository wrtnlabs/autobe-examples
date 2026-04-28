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
 * Validates that upvoting a deleted post returns a 404 Not Found error.
 *
 * This test ensures the system correctly rejects voting operations on content that has been soft-deleted. When a post is deleted, its `deleted_at` timestamp becomes non-null, removing it from active moderation and voting scopes. Attempting to upvote such a post should fail gracefully without creating a vote record or modifying the original author's karma.
 *
 * The scenario involves two separate member accounts. Member A performs the full creation lifecycle of a community, subscription, and post, followed by deleting the post. Member B then attempts to upvote the deleted post, validating that the API correctly returns a 404 status code and that no side effects occur.
 *
 * 1. Member A registers an account and authenticates.
 * 2. Member A creates a new community and subscribes to it.
 * 3. Member A creates a post within the community.
 * 4. Member A deletes their own post.
 * 5. Member B registers a separate account and authenticates.
 * 6. Member B attempts to upvote the post created and deleted by Member A.
 * 7. The system verifies that the upvote operation fails with a 404 Not Found error.
 */
export async function test_api_post_upvote_on_deleted_post_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: undefined },
    );
  typia.assert(community);
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
      } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
    },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(),
        post_type: "text",
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  await api.functional.redditLikeCommunity.member.posts.erase(
    memberAConnection,
    { postId: post.id },
  );
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  await TestValidator.httpError(
    "upvoting deleted post returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.votes.posts.upvote(
        memberBConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
