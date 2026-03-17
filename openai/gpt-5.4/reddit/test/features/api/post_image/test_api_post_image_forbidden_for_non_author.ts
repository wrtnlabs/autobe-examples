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

export async function test_api_post_image_forbidden_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const originalImageBody = {
    storage_uri: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphabets(10)}.png`,
    mime_type: "image/png",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_platform_community_id: community.id,
        post_type: "image",
        postImage: originalImageBody,
      },
    },
  );
  typia.assert(post);
  TestValidator.predicate(
    "created post has image attachment",
    post.postImage !== null,
  );
  const originalImage = typia.assert(post.postImage!);
  TestValidator.equals(
    "original image post matches parent post",
    originalImage.post.id,
    post.id,
  );
  TestValidator.equals(
    "original storage uri matches input",
    originalImage.storage_uri,
    originalImageBody.storage_uri,
  );
  TestValidator.equals(
    "original filename matches input",
    originalImage.original_name,
    originalImageBody.original_name,
  );
  TestValidator.equals(
    "original mime type matches input",
    originalImage.mime_type,
    originalImageBody.mime_type,
  );
  TestValidator.equals(
    "original byte size matches input",
    originalImage.byte_size,
    originalImageBody.byte_size,
  );
  TestValidator.equals(
    "original width matches input",
    originalImage.width,
    originalImageBody.width,
  );
  TestValidator.equals(
    "original height matches input",
    originalImage.height,
    originalImageBody.height,
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const replacementBody = {
    storage_uri: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphabets(12)}.jpg`,
    mime_type: "image/jpeg",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.IUpdate;
  TestValidator.notEquals(
    "replacement storage uri differs from original input",
    originalImageBody.storage_uri,
    replacementBody.storage_uri,
  );
  await TestValidator.httpError(
    "non-author cannot replace another member's post image",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.images.update(
        intruderConnection,
        {
          postId: post.id,
          imageId: originalImage.id,
          body: replacementBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original image storage uri remains original in memory",
    originalImage.storage_uri,
    originalImageBody.storage_uri,
  );
  TestValidator.equals(
    "original image filename remains original in memory",
    originalImage.original_name,
    originalImageBody.original_name,
  );
  TestValidator.equals(
    "original image mime type remains original in memory",
    originalImage.mime_type,
    originalImageBody.mime_type,
  );
  TestValidator.equals(
    "original image byte size remains original in memory",
    originalImage.byte_size,
    originalImageBody.byte_size,
  );
  TestValidator.equals(
    "original image width remains original in memory",
    originalImage.width,
    originalImageBody.width,
  );
  TestValidator.equals(
    "original image height remains original in memory",
    originalImage.height,
    originalImageBody.height,
  );
}
