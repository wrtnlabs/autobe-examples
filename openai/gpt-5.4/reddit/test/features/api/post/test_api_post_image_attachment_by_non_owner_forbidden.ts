import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_member_posts_images_create } from "../../../generate/generate_random_community_platform_member_posts_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_image_attachment_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const initialImageBody = {
    storage_uri: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphabets(8)}.png`,
    mime_type: "image/png",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformPostImage.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "image",
        postImage: initialImageBody,
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("owner authored post", post.author.id, ownerAuth.id);
  TestValidator.equals(
    "post belongs to created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals("post is image type", post.post_type, "image");
  TestValidator.notEquals(
    "image content exists on created image post",
    post.postImage,
    null,
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_member_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(intruderAuth);
  TestValidator.notEquals(
    "intruder differs from owner",
    intruderAuth.id,
    ownerAuth.id,
  );
  const unauthorizedImageBody = {
    storage_uri: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphabets(10)}.jpg`,
    mime_type: "image/jpeg",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformPostImage.ICreate;
  await TestValidator.error(
    "non-owner cannot attach image to another member post",
    async () => {
      await generate_random_community_platform_member_posts_images_create(
        intruderConnection,
        {
          params: {
            postId: post.id,
          },
          body: unauthorizedImageBody,
        },
      );
    },
  );
}
