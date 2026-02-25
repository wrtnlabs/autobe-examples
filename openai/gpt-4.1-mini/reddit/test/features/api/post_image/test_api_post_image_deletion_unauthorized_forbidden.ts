import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_images_create_post_image } from "../../../generate/generate_random_community_platform_user_posts_images_create_post_image";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_image_deletion_unauthorized_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Original author user joins and authorizes
  const originalAuthorJoin = await authorize_user_join(
    { host: connection.host },
    { body: {} },
  );
  typia.assert(originalAuthorJoin);
  const originalAuthorConnection: api.IConnection = { host: connection.host };
  originalAuthorConnection.headers = {
    Authorization: originalAuthorJoin.token.access,
  };
  // 2. Original author creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      originalAuthorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Original author creates a post in the community
  const postBody = {
    title: "Test post for image deletion unauthorized",
    postType: "image" as const,
    images: [{ imageUrl: `https://example.com/image.jpg` }],
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      originalAuthorConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 4. Original author uploads an image to the post
  const image =
    await generate_random_community_platform_user_posts_images_create_post_image(
      originalAuthorConnection,
      { params: { postId: post.id }, body: {} },
    );
  typia.assert(image);
  // 5. Different unauthorized user joins and authorizes
  const unauthorizedUserJoin = await authorize_user_join(
    { host: connection.host },
    { body: {} },
  );
  typia.assert(unauthorizedUserJoin);
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  unauthorizedUserConnection.headers = {
    Authorization: unauthorizedUserJoin.token.access,
  };
  // 6. Attempt to delete post image by unauthorized user
  await TestValidator.httpError(
    "delete post image unauthorized forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.user.posts.images.eraseImage(
        unauthorizedUserConnection,
        {
          postId: post.id,
          imageId: image.id,
        },
      );
    },
  );
}
