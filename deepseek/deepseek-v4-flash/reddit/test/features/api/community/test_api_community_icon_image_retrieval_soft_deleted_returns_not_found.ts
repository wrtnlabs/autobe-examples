import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
 * Test that retrieving a soft-deleted community icon image returns 404 Not Found.
 *
 * When a community replaces its icon image by uploading a new one, the previous
 * icon is automatically soft-deleted (deleted_at IS NOT NULL). The GET endpoint
 * for retrieving a specific icon image should return 404 for soft-deleted records,
 * as they are not accessible through this endpoint even though they still exist
 * in the database.
 *
 * 1. Register a new member account and obtain authentication.
 * 2. Create a new community.
 * 3. Upload a first icon image for the community.
 * 4. Upload a second icon image — this automatically soft-deletes the first one.
 * 5. Attempt to retrieve the first (now soft-deleted) icon via GET and expect 404.
 * 6. Verify the second (replacement) icon is still accessible via GET (200).
 */
export async function test_api_community_icon_image_retrieval_soft_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload first icon image
  const firstImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second icon image — this soft-deletes the first one
  const secondImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(secondImage);
  // 5. Retrieve the first (now soft-deleted) image — expect 404 Not Found
  await TestValidator.httpError(
    "soft-deleted icon image returns 404",
    404,
    async () =>
      await api.functional.communityPlatform.communities.images.at(connection, {
        communityId: community.id,
        imageId: firstImage.id,
      }),
  );
  // 6. Retrieve the second (active replacement) image — expect 200 OK
  const result = await api.functional.communityPlatform.communities.images.at(
    connection,
    {
      communityId: community.id,
      imageId: secondImage.id,
    },
  );
  typia.assert(result);
}
