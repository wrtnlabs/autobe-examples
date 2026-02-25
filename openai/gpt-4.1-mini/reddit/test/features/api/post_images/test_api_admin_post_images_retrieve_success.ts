import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_post_images_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass1234",
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(admin);
  // 2. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "UserPass1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  // 3. Create community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/icons/${RandomGenerator.alphabets(5)}.png`,
        },
      },
    );
  typia.assert(community);
  // 4. Create post with images as user
  const imageUrls = ArrayUtil.repeat(
    3,
    () => `https://example.com/images/${RandomGenerator.alphaNumeric(10)}.png`,
  );
  const postCreateBody = {
    title: RandomGenerator.name(3),
    postType: "image" as const,
    images: imageUrls.map((imageUrl) => ({ imageUrl })),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 5. Retrieve images as admin
  const images =
    (await api.functional.communityPlatform.admin.posts.images.atImages(
      adminConnection,
      {
        postId: post.id,
      },
    )) as unknown as ICommunityPlatformPostImage[];
  typia.assert(images);
  // Validate each image
  for (const image of images) {
    typia.assert<ICommunityPlatformPostImage>(image);
    void TestValidator.predicate(
      `valid image url: ${image.imageUrl}`,
      typeof image.imageUrl === "string" &&
        image.imageUrl.startsWith("https://"),
    );
    void TestValidator.equals(
      "postId matches",
      image.communityPlatformPostId,
      post.id,
    );
  }
  // 6. Authorization enforcement: try retrieve images as user (should fail)
  await TestValidator.error(
    "non-admin cannot retrieve post images",
    async () => {
      await api.functional.communityPlatform.admin.posts.images.atImages(
        userConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
