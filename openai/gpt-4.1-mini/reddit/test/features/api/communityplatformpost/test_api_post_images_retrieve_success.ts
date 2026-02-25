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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_images_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(connection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post with multiple images
  const imagesCount = 3;
  const imageUrls = ArrayUtil.repeat(
    imagesCount,
    () => `https://example.com/${RandomGenerator.alphabets(10)}.png`,
  );
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(),
    postType: "image",
    images: imageUrls.map((url) => ({ imageUrl: url })),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 4. Retrieve images for the created post
  const images =
    (await api.functional.communityPlatform.user.posts.images.atImages(
      userConnection,
      { postId: post.id },
    )) as unknown as ICommunityPlatformPostImage[];
  // Response validation: array length and content
  TestValidator.equals("image count match", images.length, imagesCount);
  // Check each image for correct postId and URLs and timestamps
  images.forEach((img: ICommunityPlatformPostImage, index: number) => {
    typia.assert(img);
    TestValidator.equals("image postId", img.communityPlatformPostId, post.id);
    TestValidator.equals("image url", img.imageUrl, imageUrls[index]);
    TestValidator.predicate(
      "image id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        img.id,
      ),
    );
    TestValidator.predicate(
      "createdAt is iso date",
      !isNaN(Date.parse(img.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt is iso date",
      !isNaN(Date.parse(img.updatedAt)),
    );
    TestValidator.equals("deletedAt null", img.deletedAt, null);
  });
}
