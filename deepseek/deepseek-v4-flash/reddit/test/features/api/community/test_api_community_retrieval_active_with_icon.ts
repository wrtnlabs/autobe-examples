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

export async function test_api_community_retrieval_active_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member (creates and authenticates a new member account)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community (owned by the authenticated member, with initial icon images)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload an additional icon image for the community
  const iconImage =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(iconImage);
  // 4. Retrieve the community via the public GET endpoint
  const retrieved = await api.functional.communityPlatform.communities.at(
    connection,
    {
      communityId: community.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate all response fields match expected values
  TestValidator.equals("id matches", retrieved.id, community.id);
  TestValidator.equals("name matches", retrieved.name, community.name);
  TestValidator.equals(
    "description matches",
    retrieved.description,
    community.description,
  );
  TestValidator.equals(
    "subscriber count is zero",
    retrieved.subscriberCount,
    0,
  );
  TestValidator.equals(
    "owner id matches",
    retrieved.owner.id,
    community.owner.id,
  );
  TestValidator.equals(
    "owner username matches",
    retrieved.owner.username,
    community.owner.username,
  );
  TestValidator.equals(
    "owner email matches",
    retrieved.owner.email,
    community.owner.email,
  );
  TestValidator.predicate(
    "icon is present",
    retrieved.icon !== null && retrieved.icon !== undefined,
  );
  if (retrieved.icon) {
    TestValidator.equals("icon id matches", retrieved.icon.id, iconImage.id);
    TestValidator.equals(
      "icon name matches",
      retrieved.icon.name,
      iconImage.name,
    );
    TestValidator.equals(
      "icon mime_type matches",
      retrieved.icon.mime_type,
      iconImage.mime_type,
    );
    TestValidator.equals(
      "icon size matches",
      retrieved.icon.size,
      iconImage.size,
    );
    TestValidator.equals("icon url matches", retrieved.icon.url, iconImage.url);
  }
  TestValidator.equals(
    "createdAt matches",
    retrieved.createdAt,
    community.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    retrieved.updatedAt,
    community.updatedAt,
  );
}
