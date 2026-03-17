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

export async function test_api_post_image_mismatched_parent_rejected(
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
    },
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "image",
        },
      },
    );
  typia.assert(firstPost);
  const firstImageCreate = {
    storage_uri: `https://example.com/${RandomGenerator.alphabets(8)}/first.png`,
    original_name: `${RandomGenerator.alphabets(10)}.png`,
    mime_type: "image/png",
    byte_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >() satisfies number as number,
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const firstImage =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: { postId: firstPost.id },
        body: firstImageCreate,
      },
    );
  typia.assert(firstImage);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "image",
        },
      },
    );
  typia.assert(secondPost);
  const secondImageCreate = {
    storage_uri: `https://example.com/${RandomGenerator.alphabets(8)}/second.jpg`,
    original_name: `${RandomGenerator.alphabets(10)}.jpg`,
    mime_type: "image/jpeg",
    byte_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >() satisfies number as number,
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.ICreate;
  const secondImage =
    await generate_random_community_platform_member_posts_images_create(
      memberConnection,
      {
        params: { postId: secondPost.id },
        body: secondImageCreate,
      },
    );
  typia.assert(secondImage);
  const updateBody = {
    storage_uri: `https://example.com/${RandomGenerator.alphabets(8)}/replacement.webp`,
    original_name: `${RandomGenerator.alphabets(12)}-replacement.webp`,
    mime_type: "image/webp",
    byte_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >() satisfies number as number,
    width: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
    height: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<4096>
    >() satisfies number as number,
  } satisfies ICommunityPlatformPostImage.IUpdate;
  TestValidator.notEquals(
    "replacement storage differs from second image baseline",
    updateBody.storage_uri,
    secondImage.storage_uri,
  );
  TestValidator.notEquals(
    "replacement original name differs from second image baseline",
    updateBody.original_name,
    secondImage.original_name,
  );
  TestValidator.notEquals(
    "replacement mime type differs from second image baseline",
    updateBody.mime_type,
    secondImage.mime_type,
  );
  await TestValidator.httpError(
    "mismatched image parent path is rejected",
    [400, 403, 404, 409, 422],
    async () => {
      await api.functional.communityPlatform.member.posts.images.update(
        memberConnection,
        {
          postId: firstPost.id,
          imageId: secondImage.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "first image baseline storage remains original",
    firstImage.storage_uri,
    firstImageCreate.storage_uri,
  );
  TestValidator.equals(
    "first image baseline original name remains original",
    firstImage.original_name,
    firstImageCreate.original_name,
  );
  TestValidator.equals(
    "first image baseline mime type remains original",
    firstImage.mime_type,
    firstImageCreate.mime_type,
  );
  TestValidator.equals(
    "first image baseline byte size remains original",
    firstImage.byte_size,
    firstImageCreate.byte_size,
  );
  TestValidator.equals(
    "first image baseline width remains original",
    firstImage.width,
    firstImageCreate.width ?? null,
  );
  TestValidator.equals(
    "first image baseline height remains original",
    firstImage.height,
    firstImageCreate.height ?? null,
  );
  TestValidator.equals(
    "second image baseline storage remains original",
    secondImage.storage_uri,
    secondImageCreate.storage_uri,
  );
  TestValidator.equals(
    "second image baseline original name remains original",
    secondImage.original_name,
    secondImageCreate.original_name,
  );
  TestValidator.equals(
    "second image baseline mime type remains original",
    secondImage.mime_type,
    secondImageCreate.mime_type,
  );
  TestValidator.equals(
    "second image baseline byte size remains original",
    secondImage.byte_size,
    secondImageCreate.byte_size,
  );
  TestValidator.equals(
    "second image baseline width remains original",
    secondImage.width,
    secondImageCreate.width ?? null,
  );
  TestValidator.equals(
    "second image baseline height remains original",
    secondImage.height,
    secondImageCreate.height ?? null,
  );
  TestValidator.equals(
    "second image remains bound to second post",
    secondImage.post.id,
    secondPost.id,
  );
  TestValidator.notEquals(
    "second image is not bound to first post",
    secondImage.post.id,
    firstPost.id,
  );
}
