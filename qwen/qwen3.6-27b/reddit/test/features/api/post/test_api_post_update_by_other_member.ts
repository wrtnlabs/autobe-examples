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
 * Tests that a member cannot update a post authored by another member.
 *
 * Authenticates two separate members. The first member creates a community, subscribes to it, and creates a post. The second member then attempts to update the first member's post. Validates that the system rejects the unauthorized update with a 403 Forbidden error, ensuring strict ownership enforcement where only the original post author can modify their content.
 *
 * 1. First member authenticates via join.
 * 2. First member creates a community.
 * 3. First member subscribes to the community.
 * 4. First member creates a post in the community.
 * 5. Second member authenticates via join.
 * 6. Second member attempts to update the first member's post.
 * 7. Validates that the update fails with 403 Forbidden error.
 */
export async function test_api_post_update_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {},
  });
  // 2. First member creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. First member subscribes to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberAConnection,
    {
      body: { community_id: community.id },
    },
  );
  // 4. First member creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberAConnection,
    {
      body: { community_id: community.id, post_type: "text" },
    },
  );
  typia.assert(post);
  // 5. Second member authenticates
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {},
  });
  // 6-7. Second member attempts to update the first member's post
  // This should fail with 403 Forbidden
  const body = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IREdditLikeCommunityPost.IUpdate;
  await TestValidator.httpError(
    "unauthorized post update by other member returns 403",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.posts.update(
        memberBConnection,
        {
          postId: post.id,
          body,
        },
      );
    },
  );
}
