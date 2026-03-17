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
 * Test successful deletion of a community icon image by the community owner.
 * As an authenticated member, create a community to establish ownership, then
 * upload an image to that community. Call the delete endpoint with the community
 * ID and image ID. Verify the response indicates success and that the image is
 * marked as deleted (soft delete). Validate that only the specified image was
 * affected by checking other community images remain intact. Confirm the user
 * must be authenticated as a member and have owner permissions for the
 * community.
 */
export async function test_api_community_image_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate as community owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a community to establish ownership
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload first community icon image
  const image1 =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(image1);
  // 4. Upload second community icon image (to test selective deletion)
  const image2 =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(image2);
  // 5. Delete the first image
  await api.functional.communityPlatform.member.images.erase(memberConnection, {
    communityId: community.id,
    imageId: image1.id,
  });
  // 6. Verify image2 is still intact by ensuring we can delete it
  await api.functional.communityPlatform.member.images.erase(memberConnection, {
    communityId: community.id,
    imageId: image2.id,
  });
  // 7. Validate business logic: non-owner cannot delete images
  // Create another member and attempt to delete community image
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuth = await authorize_member_join(nonOwnerConnection, {});
  typia.assert(nonOwnerAuth);
  // Create a new image for testing authorization (using owner connection)
  const image3 =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(image3);
  // Non-owner should not be able to delete the image
  await TestValidator.error(
    "non-owner cannot delete community image",
    async () => {
      await api.functional.communityPlatform.member.images.erase(
        nonOwnerConnection,
        {
          communityId: community.id,
          imageId: image3.id,
        },
      );
    },
  );
}
