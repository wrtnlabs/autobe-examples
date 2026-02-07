import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_image_retrieval(
  connection: api.IConnection,
) {
  // Create membership through join
  const adminConnection: api.IConnection = { host: connection.host };
  const memberId = await authorize_member_join(adminConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  typia.assert(adminConnection.headers);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Subscribe to community (corrected to use proper subscription endpoint)
  await api.functional.communityPlatform.member.communities.subscriptions.create(
    adminConnection,
    {
      communityId: community.id,
    },
  );
  // Create post
  const post = await generate_random_community_platform_member_posts_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "image",
        community_id: community.id,
        imageUrl: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // Create user-specific connection for image retrieval
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: typia.random<ICommunityPlatformMember.ILogin>(),
  });
  typia.assert(userConnection.headers);
  // Retrieve images with pagination
  const images = await api.functional.communityPlatform.posts.images.index(
    userConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        pageSize: 10,
        sort: "created_at:desc",
      },
    },
  );
  typia.assert(images);
  // Validate response structure
  TestValidator.equals("Image pagination metadata", images.pagination, {
    current: 1,
    limit: 10,
    records: 1,
    pages: 1,
  });
  TestValidator.equals("Image items count", (images.data ?? []).length, 1);
  TestValidator.equals("First image ID", images.data[0].id, post.id);
}
