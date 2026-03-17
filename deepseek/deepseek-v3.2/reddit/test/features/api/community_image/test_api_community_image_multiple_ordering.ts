import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

export async function test_api_community_image_multiple_ordering(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Upload three images with different ordering values
  const imageTypes = ["image/jpeg", "image/png", "image/gif"] as const;
  const uploadedImages: ICommunityPlatformCommunityImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image =
      await generate_random_community_platform_member_communities_images_create(
        memberConnection,
        {
          params: { communityId: community.id },
          body: {
            uri: `https://example.com/community-images/${typia.random<string & tags.Format<"uuid">>()}.${i === 0 ? "jpg" : i === 1 ? "png" : "gif"}`,
            filename: `image${i}.${i === 0 ? "jpg" : i === 1 ? "png" : "gif"}`,
            content_type: imageTypes[i],
            width: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<1000>
            >(),
            height: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<1000>
            >(),
            size_bytes: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1024> &
                tags.Maximum<2097152>
            >(),
            ordering: i satisfies number as number,
            active: i === 2, // Only third image is active
          },
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }
  // Retrieve each image individually and validate
  for (let i = 0; i < uploadedImages.length; i++) {
    const image = uploadedImages[i];
    const retrieved = await api.functional.communityPlatform.images.at(
      connection,
      {
        communityId: community.id,
        imageId: image.id,
      },
    );
    typia.assert(retrieved);
    // Validate image properties
    TestValidator.equals(`image ${i} id matches`, retrieved.id, image.id);
    TestValidator.equals(`image ${i} ordering matches`, retrieved.ordering, i);
    TestValidator.equals(`image ${i} active status`, retrieved.active, i === 2);
    TestValidator.equals(
      `image ${i} community id`,
      retrieved.community.id,
      community.id,
    );
    TestValidator.predicate(
      `image ${i} has valid uri`,
      retrieved.uri.length > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid dimensions`,
      retrieved.width > 0 && retrieved.height > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid size`,
      retrieved.sizeBytes > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid content type`,
      ["image/jpeg", "image/png", "image/gif"].includes(retrieved.contentType),
    );
  }
  // Validate only one image is active
  const activeImages = uploadedImages.filter((img) => img.active);
  TestValidator.equals("only one active image", activeImages.length, 1);
  TestValidator.equals(
    "active image is third one",
    activeImages[0].ordering,
    2,
  );
  // Validate ordering values are sequential
  for (let i = 0; i < uploadedImages.length; i++) {
    TestValidator.equals(
      `image ${i} ordering is ${i}`,
      uploadedImages[i].ordering,
      i,
    );
  }
  // Validate all images have unique URIs
  const uris = uploadedImages.map((img) => img.uri);
  const uniqueUris = new Set(uris);
  TestValidator.equals(
    "all images have unique URIs",
    uniqueUris.size,
    uris.length,
  );
  // Validate all images belong to same community
  for (const image of uploadedImages) {
    TestValidator.equals(
      "image belongs to correct community",
      image.community.id,
      community.id,
    );
  }
  // Validate image dimensions vary (at least some difference)
  const widths = uploadedImages.map((img) => img.width);
  const heights = uploadedImages.map((img) => img.height);
  const sizeBytes = uploadedImages.map((img) => img.sizeBytes);
  // Check if dimensions vary (not all same)
  TestValidator.predicate(
    "widths vary",
    new Set(widths).size > 1 || widths.length === 1,
  );
  TestValidator.predicate(
    "heights vary",
    new Set(heights).size > 1 || heights.length === 1,
  );
  TestValidator.predicate(
    "file sizes vary",
    new Set(sizeBytes).size > 1 || sizeBytes.length === 1,
  );
  // Validate content types vary
  const contentTypes = uploadedImages.map((img) => img.contentType);
  TestValidator.equals(
    "content types vary between images",
    new Set(contentTypes).size,
    contentTypes.length,
  );
}
