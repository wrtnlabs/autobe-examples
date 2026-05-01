import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that retrieving a soft-deleted post returns HTTP 404.
 *
 * Validates the business rule that soft-deleted posts are excluded from retrieval
 * through the post detail endpoint. A member creates a community, subscribes to it,
 * publishes a text post, then deletes that post. After deletion, requesting the
 * post by its original ID must return 404 Not Found, confirming soft-deleted posts
 * are inaccessible to all users including the original author.
 *
 * 1. Member registers and authenticates via join.
 * 2. Member creates a community and becomes its owner.
 * 3. Member subscribes to the newly created community.
 * 4. Member creates a text post within the community.
 * 5. Member soft-deletes the post.
 * 6. Retrieving the deleted post by its ID returns 404 Not Found.
 */
export async function test_api_post_detail_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Soft-delete the post
  await api.functional.communityHub.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 6. Attempt retrieval → expect 404
  await TestValidator.httpError(
    "deleted post returns 404",
    404,
    async () =>
      await api.functional.communityHub.posts.at(memberConnection, {
        postId: post.id,
      }),
  );
}
