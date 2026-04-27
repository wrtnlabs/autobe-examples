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
 * Test that the community owner can update the community icon image.
 *
 * Verifies the complete workflow for replacing a community's icon: member registration, community creation with an initial icon, and icon update via the PUT endpoint. Ensures the new icon's storage URL differs from the original and that the icon's creation timestamp reflects the update time.
 *
 * 1. Register a new member via the authentication join flow.
 * 2. Create a community with an initial icon image (at least one image is required).
 * 3. Capture the original icon metadata from the created community.
 * 4. Generate a new random icon image and update the community's icon.
 * 5. Validate that the icon URL has changed and the new icon's created_at is later than the original.
 */
export async function test_api_community_update_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community with an initial icon image
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Capture the original icon (runtime validated as non-null)
  const originalIcon = typia.assert(community.icon!);
  // 4. Prepare a new icon image with random data
  const newIcon = typia.random<ICommunityPlatformCommunityImage.ICreate>();
  // 5. Update the community with the new icon
  const updated =
    await api.functional.communityPlatform.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          icon: newIcon,
        } satisfies ICommunityPlatformCommunity.IUpdate,
      },
    );
  typia.assert(updated);
  // 6. Validate the icon was updated
  const updatedIcon = typia.assert(updated.icon!);
  TestValidator.notEquals(
    "icon url changed",
    updatedIcon.url,
    originalIcon.url,
  );
  TestValidator.predicate(
    "icon created_at is later than original",
    updatedIcon.created_at > originalIcon.created_at,
  );
}
