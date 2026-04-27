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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that retrieving a completely non-existent community icon image yields 404 Not Found.
 *
 * Validates the endpoint's behavior when querying an image UUID that was never
 * created for an existing community. Uses a valid community context to distinguish
 * this "image not found" scenario from a "community not found" scenario.
 *
 * A member is registered and creates a community (which automatically gets an icon
 * image), confirming the community exists and can host images. Then the test queries
 * a random UUID that does not match any existing image record.
 *
 * 1. Register a new member via `authorize_member_join`.
 * 2. Create a community via `generate_random_community_platform_member_communities_create`.
 * 3. Call `GET /communityPlatform/communities/{communityId}/images/{imageId}` with a non-existent UUID.
 * 4. Assert HTTP 404 Not Found response.
 */
export async function test_api_community_icon_image_retrieval_non_existent_image_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (automatically creates an icon image)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Generate a non-existent image UUID
  const nonExistentImageId = typia.random<string & tags.Format<"uuid">>();
  // 4. Assert 404 Not Found
  await TestValidator.httpError(
    "non-existent image returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.communities.images.at(
        memberConnection,
        {
          communityId: community.id,
          imageId: nonExistentImageId,
        },
      );
    },
  );
}
