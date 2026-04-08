import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
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
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test unauthorized post deletion by non-owner member.
 *
 * Validates that members cannot delete posts they do not own and are not moderators of. The test creates two authenticated members where one creates a community and publishes a post, while the second member attempts to delete that post without proper authorization. The deletion attempt must fail with a 403 Forbidden error to ensure the authorization enforcement is working correctly.
 *
 * This test verifies the business logic that prevents unauthorized content removal, ensuring that only post authors, community owners, and community moderators can delete posts within their communities.
 *
 * 1. Register first member and create connection.
 * 2. First member creates a community.
 * 3. First member subscribes to the community.
 * 4. First member creates a text post in the community.
 * 5. Register second member and create separate connection.
 * 6. Second member subscribes to the same community.
 * 7. Second member attempts to delete the first member's post.
 * 8. Validates that the deletion fails with 403 Forbidden error.
 */
export async function test_api_post_unauthorized_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member and authenticate
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    firstMemberConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe first member to community
  await generate_random_reddit_like_member_subscriptions_create(
    firstMemberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 4. Create post by first member
  const post = await generate_random_reddit_like_member_posts_create(
    firstMemberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create second member and authenticate
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(secondMember);
  // 6. Subscribe second member to the same community
  await generate_random_reddit_like_member_subscriptions_create(
    secondMemberConnection,
    {
      body: {
        communityId: community.id,
      } satisfies IRedditLikeCommunitySubscription.ICreate,
    },
  );
  // 7. Second member attempts to delete first member's post (should fail)
  await TestValidator.httpError("unauthorized post deletion", 403, async () => {
    await api.functional.redditLike.member.posts.erase(secondMemberConnection, {
      postId: post.id,
    });
  });
}
