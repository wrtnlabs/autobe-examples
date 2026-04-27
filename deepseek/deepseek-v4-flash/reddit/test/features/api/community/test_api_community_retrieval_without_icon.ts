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
 * Test retrieving an active community that has never uploaded an icon image.
 *
 * Validates that the GET endpoint returns the community with the `icon` field
 * explicitly set to `null` when no icon image has ever been uploaded. Also
 * verifies that all other community fields (name, description, subscriberCount,
 * owner) are correctly populated.
 *
 * 1. Register a new member account via the join flow.
 * 2. Create a community without providing any icon images.
 * 3. Retrieve the community by its UUID using the public GET endpoint.
 * 4. Validate the response structure and confirm `icon` is null.
 */
export async function test_api_community_retrieval_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community without any icon image
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: { images: [] } },
    );
  typia.assert(community);
  // 3. Retrieve the community by ID (public endpoint, no auth required)
  const retrieved = await api.functional.communityPlatform.communities.at(
    connection,
    { communityId: community.id },
  );
  typia.assert(retrieved);
  // 4. Validate icon is explicitly null (not missing, not undefined)
  TestValidator.equals("icon is null", retrieved.icon, null);
  // 5. Validate other community fields are correctly populated
  TestValidator.equals(
    "community name matches",
    retrieved.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrieved.description,
    community.description,
  );
  TestValidator.equals(
    "subscriber count starts at 0",
    retrieved.subscriberCount,
    0,
  );
  TestValidator.equals(
    "owner id matches member id",
    retrieved.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner username matches",
    retrieved.owner.username,
    authorized.username,
  );
}
