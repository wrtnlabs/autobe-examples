import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_images_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup member connection
  const memberAuthorization = await authorize_member_join(connection, {});
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuthorization.token.access },
  };
  // Create a community owned by the member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // Subscribe member to the community (required before posting)
  await generate_random_community_platform_member_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // Create an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        contentType: "image",
        imageUrl: typia.random<string & tags.Format<"uri">>(),
        title: RandomGenerator.name(),
        textContent: null,
        linkUrl: null,
      },
    },
  );
  typia.assert(post);
  // Test: Retrieve images from the post (public endpoint - no auth required)
  const response = await api.functional.communityPlatform.posts.images.index(
    connection,
    {
      postId: post.id,
      body: {
        limit: 20,
        page: 1,
      } satisfies ICommunityPlatformPostImage.IRequest,
    },
  );
  typia.assert(response);
  // Validate images are sorted by order ascending (business logic validation)
  for (let i = 1; i < response.data.length; i++) {
    TestValidator.predicate(
      "images sorted by order ascending",
      response.data[i - 1].order <= response.data[i].order,
    );
  }
}
