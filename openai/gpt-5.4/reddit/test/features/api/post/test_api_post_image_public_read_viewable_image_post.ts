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

export async function test_api_post_image_public_read_viewable_image_post(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const imageBody = {
    storage_uri: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphaNumeric(8)}.png`,
    mime_type: "image/png",
    byte_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    width: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "image",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const createdImage =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: imageBody,
      },
    );
  typia.assert(createdImage);
  const guestConnection: api.IConnection = { host: connection.host };
  const readImage = await api.functional.communityPlatform.posts.images.at(
    guestConnection,
    {
      postId: post.id,
      imageId: createdImage.id,
    },
  );
  typia.assert(readImage);
  TestValidator.equals("image id matches", readImage.id, createdImage.id);
  TestValidator.equals(
    "storage uri matches",
    readImage.storage_uri,
    createdImage.storage_uri,
  );
  TestValidator.equals(
    "original name matches",
    readImage.original_name,
    createdImage.original_name,
  );
  TestValidator.equals(
    "mime type matches",
    readImage.mime_type,
    createdImage.mime_type,
  );
  TestValidator.equals(
    "byte size matches",
    readImage.byte_size,
    createdImage.byte_size,
  );
  TestValidator.equals("width matches", readImage.width, createdImage.width);
  TestValidator.equals("height matches", readImage.height, createdImage.height);
  TestValidator.equals("parent post id matches", readImage.post.id, post.id);
  TestValidator.equals(
    "parent post title matches",
    readImage.post.title,
    post.title,
  );
  TestValidator.equals(
    "parent post type matches",
    readImage.post.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "parent community id matches",
    readImage.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "parent author id matches",
    readImage.post.author.id,
    post.author.id,
  );
}
