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
 * Test that regular members cannot delete posts authored by other members.
 *
 * Validates authorization enforcement on post deletion: only the original author of a post may delete it. When a non-author member attempts to delete another member's post, the endpoint must reject the request with 403 Forbidden, preserving content ownership boundaries.
 *
 * This ensures that regular users cannot remove other users' content, maintaining platform integrity and preventing unauthorized content manipulation.
 *
 * 1. Member A (author) authenticates with randomized credentials.
 * 2. Member A creates a community and subscribes to it.
 * 3. Member A creates a post within that community.
 * 4. Member B (non-author) authenticates as a separate account.
 * 5. Member B attempts to delete Member A's post.
 * 6. The deletion request is rejected with 403 Forbidden.
 */
export async function test_api_post_deletion_reject_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, { body: {} });
  // 2. Create community as author
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      authorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe author to the community
  const subscription: IRedditLikeCommunityCommunitySubscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      authorConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create post as author
  const post: IREdditLikeCommunityPost =
    await generate_random_reddit_like_community_member_posts_create(
      authorConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(post);
  // 5. Authenticate Member B (non-author)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonAuthorConnection, { body: {} });
  // 6. Non-author attempts to delete author's post - must be rejected with 403
  await TestValidator.httpError(
    "non-author cannot delete other member's post",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.posts.erase(
        nonAuthorConnection,
        { postId: post.id },
      );
    },
  );
}
