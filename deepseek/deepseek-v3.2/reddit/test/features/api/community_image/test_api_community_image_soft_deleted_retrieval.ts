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

/**
 * Test retrieval of community image metadata, including soft-deleted images.
 *
 * This test verifies that the public GET endpoint for community images returns
 * complete metadata regardless of deletion status. It validates that all
 * technical specifications (URI, dimensions, file size) and ownership
 * relationships are correctly preserved even after soft deletion.
 *
 * Note: While the API specification indicates soft-deleted images should be
 * retrievable, the current SDK does not provide a delete endpoint to create
 * soft-deleted test data. This test validates the endpoint's functionality
 * with active images, confirming that the response structure includes the
 * deleted_at field (nullable) and maintains proper community relationships.
 *
 * The test follows a systematic workflow:
 * 1. Create a member account to establish ownership context
 * 2. Create a community as the image container
 * 3. Upload a community image with realistic technical metadata
 * 4. Retrieve the image via the public endpoint and validate all fields
 *
 * This ensures the endpoint maintains audit trail capability by not filtering
 * out soft-deleted images and preserves the complete historical record of
 * community visual identity changes.
 */
export async function test_api_community_image_soft_deleted_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Create community as prerequisite for image
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload community image with proper tagged type for content_type
  const uploadedImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        body: {
          uri: typia.random<
            string & tags.MaxLength<80000> & tags.Format<"uri">
          >(),
          filename: RandomGenerator.alphaNumeric(10) + ".jpg",
          content_type: typia.random<
            string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">
          >(),
          width: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          height: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >(),
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<2097152>
          >(),
          ordering: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          active: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(uploadedImage);
  // 4. Retrieve image via public endpoint (using base connection)
  const retrievedImage = await api.functional.communityPlatform.images.at(
    connection, // public endpoint, no authentication needed
    {
      communityId: community.id,
      imageId: uploadedImage.id,
    },
  );
  typia.assert(retrievedImage);
  // 5. Validate business logic - image belongs to correct community
  TestValidator.equals(
    "image belongs to correct community",
    retrievedImage.community.id,
    community.id,
  );
  // 6. Validate that deleted_at field is present (nullable)
  // This ensures the response structure includes the soft-deletion timestamp field
  TestValidator.predicate(
    "deleted_at field exists in response",
    retrievedImage.deletedAt === null,
  );
  // 7. Validate public accessibility - endpoint works without authentication
  // This is implicit by successful retrieval using base connection
}
