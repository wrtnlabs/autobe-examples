import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
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
import { generate_random_community_platform_member_moderation_roles_create } from "../../../generate/generate_random_community_platform_member_moderation_roles_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderation_role } from "../../../prepare/prepare_random_community_platform_moderation_role";

export async function test_api_community_icon_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create moderator member account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 3. Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Generate random image data with proper constraints
  const firstImageUri = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const secondImageUri = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const imageContentType = typia.random<
    string & tags.Pattern<"^(image\\/(jpeg|png|gif))$">
  >();
  // 5. Owner uploads first image (active by default)
  const firstImage =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          active: true,
          ordering: 0,
          uri: firstImageUri,
          filename: RandomGenerator.alphaNumeric(10) + ".jpg",
          content_type: imageContentType,
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
        },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals("first image should be active", firstImage.active, true);
  TestValidator.equals(
    "first image ordering should be 0",
    firstImage.ordering,
    0,
  );
  // 6. Owner uploads second image (inactive by default)
  const secondImage =
    await generate_random_community_platform_member_communities_images_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          active: false,
          ordering: 1,
          uri: secondImageUri,
          filename: RandomGenerator.alphaNumeric(10) + ".png",
          content_type: imageContentType,
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
        },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image should be inactive",
    secondImage.active,
    false,
  );
  TestValidator.equals(
    "second image ordering should be 1",
    secondImage.ordering,
    1,
  );
  // 7. Owner promotes moderator to moderator role
  const moderationRole =
    await generate_random_community_platform_member_moderation_roles_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: moderator.id,
          roleType: "moderator" as const,
        },
      },
    );
  typia.assert(moderationRole);
  TestValidator.equals(
    "role type should be moderator",
    moderationRole.roleType,
    "moderator",
  );
  // 8. Moderator updates second image metadata
  const updateBody = {
    ordering: 0, // Change ordering to 0 (should appear first)
    active: true, // Activate this image
  } satisfies ICommunityPlatformCommunityImage.IUpdate;
  typia.assert(updateBody);
  const updatedImage =
    await api.functional.communityPlatform.member.images.update(
      moderatorConnection,
      {
        communityId: community.id,
        imageId: secondImage.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  // 9. Validate update results
  TestValidator.equals(
    "ordering should be updated to 0",
    updatedImage.ordering,
    0,
  );
  TestValidator.equals("image should be activated", updatedImage.active, true);
  TestValidator.equals(
    "uri should remain unchanged",
    updatedImage.uri,
    secondImage.uri,
  );
  TestValidator.equals(
    "filename should remain unchanged",
    updatedImage.filename,
    secondImage.filename,
  );
  TestValidator.equals(
    "contentType should remain unchanged",
    updatedImage.contentType,
    secondImage.contentType,
  );
  TestValidator.equals(
    "width should remain unchanged",
    updatedImage.width,
    secondImage.width,
  );
  TestValidator.equals(
    "height should remain unchanged",
    updatedImage.height,
    secondImage.height,
  );
  TestValidator.equals(
    "sizeBytes should remain unchanged",
    updatedImage.sizeBytes,
    secondImage.sizeBytes,
  );
  TestValidator.equals(
    "community id should match",
    updatedImage.community.id,
    community.id,
  );
  // 10. Verify activation cascade by attempting to activate first image
  // If system correctly deactivated first image when second was activated,
  // trying to activate first image again should work (or at least not error)
  // This is an indirect test since we don't have GET endpoint
  const reactivateBody = {
    active: true,
  } satisfies ICommunityPlatformCommunityImage.IUpdate;
  typia.assert(reactivateBody);
  // This should succeed and first image should become active again
  const reactivatedImage =
    await api.functional.communityPlatform.member.images.update(
      ownerConnection, // Owner can still update
      {
        communityId: community.id,
        imageId: firstImage.id,
        body: reactivateBody,
      },
    );
  typia.assert(reactivatedImage);
  TestValidator.equals(
    "first image should be reactivatable",
    reactivatedImage.active,
    true,
  );
  // Now second image should be deactivated due to cascade
  // Verify by checking second image status (if we had GET endpoint)
  // Since we don't, we just note this limitation
}
