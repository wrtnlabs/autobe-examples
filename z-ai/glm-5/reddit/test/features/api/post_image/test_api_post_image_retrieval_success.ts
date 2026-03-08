import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_images_attach_image } from "../../../generate/generate_random_community_platform_member_posts_images_attach_image";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Setup: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Setup: Subscribe to the community (required before creating posts)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Setup: Create an image-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "image",
        textContent: null,
        linkUrl: null,
        imageUrl: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(post);
  // Setup: Attach an image to the post
  const attachedImage =
    await generate_random_community_platform_member_posts_images_attach_image(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(attachedImage);
  // Test: Retrieve image metadata as a guest (unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  const fileMetadata = await api.functional.communityPlatform.posts.images.at(
    guestConnection,
    {
      postId: post.id,
      fileId: attachedImage.id,
    },
  );
  typia.assert(fileMetadata);
  // Validate: Required fields are present
  TestValidator.predicate("id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      fileMetadata.id,
    ),
  );
  TestValidator.predicate(
    "originalName is not empty",
    fileMetadata.originalName.length > 0,
  );
  // Validate: MIME type is one of the supported formats
  const supportedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  TestValidator.predicate("mimeType is supported format", () =>
    supportedMimeTypes.includes(fileMetadata.mimeType),
  );
  // Validate: File size is positive
  TestValidator.predicate("fileSize is positive", fileMetadata.fileSize > 0);
  // Validate: Dimensions are within valid range (1-8192 pixels)
  if (fileMetadata.width !== null) {
    TestValidator.predicate(
      "width within valid range",
      () => fileMetadata.width! >= 1 && fileMetadata.width! <= 8192,
    );
  }
  if (fileMetadata.height !== null) {
    TestValidator.predicate(
      "height within valid range",
      () => fileMetadata.height! >= 1 && fileMetadata.height! <= 8192,
    );
  }
  // Validate: URL is properly formatted
  TestValidator.predicate("url is valid URL", () =>
    /^https?:\/\/.+/i.test(fileMetadata.url),
  );
  // Validate: File type
  TestValidator.equals(
    "fileType is correct",
    fileMetadata.fileType,
    "post_image",
  );
  // Validate: Versions array is present and contains expected types
  TestValidator.predicate("versions array exists", () =>
    Array.isArray(fileMetadata.versions),
  );
  TestValidator.predicate("has versions", fileMetadata.versions.length > 0);
  const versionTypes = fileMetadata.versions.map((v) => v.versionType);
  TestValidator.predicate("has thumbnail version", () =>
    versionTypes.includes("thumbnail"),
  );
  TestValidator.predicate("has medium version", () =>
    versionTypes.includes("medium"),
  );
  TestValidator.predicate("has large version", () =>
    versionTypes.includes("large"),
  );
  TestValidator.predicate("has original version", () =>
    versionTypes.includes("original"),
  );
  // Validate: Each version has required fields
  for (const version of fileMetadata.versions) {
    TestValidator.predicate("version has valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        version.id,
      ),
    );
    TestValidator.predicate("version width is positive", version.width > 0);
    TestValidator.predicate("version height is positive", version.height > 0);
    TestValidator.predicate(
      "version fileSize is positive",
      version.fileSize > 0,
    );
    TestValidator.predicate("version url is valid", () =>
      /^https?:\/\/.+/i.test(version.url),
    );
  }
  // Validate: Timestamps are present
  TestValidator.predicate("createdAt is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fileMetadata.createdAt),
  );
  TestValidator.predicate("updatedAt is valid date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(fileMetadata.updatedAt),
  );
}
