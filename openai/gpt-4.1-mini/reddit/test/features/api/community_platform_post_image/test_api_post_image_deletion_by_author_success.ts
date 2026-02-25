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

export async function test_api_post_image_deletion_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(),
    postType: "image",
    images: ArrayUtil.repeat(1, () => {
      return {
        imageUrl: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
      };
    }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);
  // 4. Upload additional image to the post
  const uploadedImage =
    await generate_random_community_platform_user_posts_images_create_post_image(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          images: [
            {
              imageUrl: `https://example.com/${RandomGenerator.alphabets(10)}.png`,
            },
          ],
        },
      },
    );
  typia.assert(uploadedImage);
  // 5. Delete the uploaded image
  await api.functional.communityPlatform.user.posts.images.eraseImage(
    userConnection,
    {
      postId: post.id,
      imageId: uploadedImage.id,
    },
  );
  // 6. Confirm deletion by attempting to list images and checking absence
  // Since there's no direct API listed to list images, we'll try to delete again and expect 404
  await TestValidator.error(
    "should fail to delete non-existing image",
    async () => {
      await api.functional.communityPlatform.user.posts.images.eraseImage(
        userConnection,
        {
          postId: post.id,
          imageId: uploadedImage.id,
        },
      );
    },
  );
}
