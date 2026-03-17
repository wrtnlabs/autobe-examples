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

export async function test_api_post_image_replacement_by_author(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
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
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        community_platform_community_id: community.id,
        post_type: "image",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const initialImageBody = {
    storage_uri: `https://storage.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    original_name: `original-${RandomGenerator.alphaNumeric(10)}.png`,
    mime_type: "image/png",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformPostImage.ICreate;
  const initialImage =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: initialImageBody,
      },
    );
  typia.assert(initialImage);
  const replacementBody = {
    storage_uri: `https://storage.example.com/replaced/${RandomGenerator.alphaNumeric(16)}.webp`,
    original_name: `replacement-${RandomGenerator.alphaNumeric(10)}.webp`,
    mime_type: "image/webp",
    byte_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    width: typia.random<number & tags.Type<"int32">>(),
    height: typia.random<number & tags.Type<"int32">>(),
  } satisfies ICommunityPlatformPostImage.IUpdate;
  const updated =
    await api.functional.communityPlatform.member.posts.images.update(
      memberConnection,
      {
        postId: post.id,
        imageId: initialImage.id,
        body: replacementBody,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "storage uri actually changes",
    initialImage.storage_uri,
    replacementBody.storage_uri,
  );
  TestValidator.notEquals(
    "original name actually changes",
    initialImage.original_name,
    replacementBody.original_name,
  );
  TestValidator.notEquals(
    "mime type actually changes",
    initialImage.mime_type,
    replacementBody.mime_type,
  );
  TestValidator.equals("image id is preserved", updated.id, initialImage.id);
  TestValidator.equals(
    "parent post id is preserved",
    updated.post.id,
    initialImage.post.id,
  );
  TestValidator.equals(
    "parent post title is preserved",
    updated.post.title,
    initialImage.post.title,
  );
  TestValidator.equals(
    "parent post type is preserved",
    updated.post.post_type,
    initialImage.post.post_type,
  );
  TestValidator.equals(
    "parent post status is preserved",
    updated.post.status,
    initialImage.post.status,
  );
  TestValidator.equals(
    "parent post created_at is preserved",
    updated.post.created_at,
    initialImage.post.created_at,
  );
  TestValidator.equals(
    "storage uri updated",
    updated.storage_uri,
    replacementBody.storage_uri,
  );
  TestValidator.equals(
    "original name updated",
    updated.original_name,
    replacementBody.original_name,
  );
  TestValidator.equals(
    "mime type updated",
    updated.mime_type,
    replacementBody.mime_type,
  );
  TestValidator.equals(
    "byte size updated",
    updated.byte_size,
    replacementBody.byte_size,
  );
  TestValidator.equals("width updated", updated.width, replacementBody.width);
  TestValidator.equals(
    "height updated",
    updated.height,
    replacementBody.height,
  );
  TestValidator.equals(
    "created_at is stable",
    updated.created_at,
    initialImage.created_at,
  );
  TestValidator.notEquals(
    "updated_at advances",
    updated.updated_at,
    initialImage.updated_at,
  );
  TestValidator.equals(
    "image remains associated to same post",
    updated.post.id,
    post.id,
  );
}
