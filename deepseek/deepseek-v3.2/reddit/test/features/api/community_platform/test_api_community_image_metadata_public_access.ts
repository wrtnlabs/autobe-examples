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

export async function test_api_community_image_metadata_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload community image using utility function
  const image =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {},
      },
    );
  typia.assert(image);
  // 4. Create unauthenticated connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // 5. Retrieve image metadata using public endpoint (no authentication required)
  const publicImage = await api.functional.communityPlatform.images.at(
    publicConnection,
    {
      communityId: community.id,
      imageId: image.id,
    },
  );
  typia.assert(publicImage);
  // 6. Validate business logic - image belongs to correct community
  TestValidator.equals(
    "community id matches",
    publicImage.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    publicImage.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    publicImage.community.description,
    community.description,
  );
  TestValidator.equals(
    "community owner id matches",
    publicImage.community.owner.id,
    community.owner.id,
  );
  // 7. Validate uploaded metadata matches retrieved metadata
  TestValidator.equals(
    "width matches uploaded",
    publicImage.width,
    image.width,
  );
  TestValidator.equals(
    "height matches uploaded",
    publicImage.height,
    image.height,
  );
  TestValidator.equals(
    "size_bytes matches uploaded",
    publicImage.sizeBytes,
    image.sizeBytes,
  );
  TestValidator.equals(
    "content_type matches uploaded",
    publicImage.contentType,
    image.contentType, // FIXED: Changed content_type to contentType
  );
  TestValidator.equals(
    "ordering matches uploaded",
    publicImage.ordering,
    image.ordering,
  );
  TestValidator.equals(
    "active matches uploaded",
    publicImage.active,
    image.active,
  );
  TestValidator.equals(
    "filename matches uploaded",
    publicImage.filename,
    image.filename,
  );
  TestValidator.equals("uri matches uploaded", publicImage.uri, image.uri);
  // 8. Validate image is active and not deleted
  TestValidator.equals(
    "deleted_at null for active image",
    publicImage.deletedAt,
    null,
  );
  // 9. Validate timestamps are present
  TestValidator.predicate(
    "created_at present",
    publicImage.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    publicImage.updatedAt.length > 0,
  );
}
