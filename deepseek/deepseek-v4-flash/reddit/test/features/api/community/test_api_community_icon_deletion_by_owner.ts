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
 * Test that the community owner can successfully delete the community icon image.
 *
 * Validates the complete flow of icon image deletion by the community owner. A registered member creates a community (which automatically creates an initial icon image), then deletes that icon image via the DELETE endpoint. Since the SDK returns `void`, the test verifies that no error is thrown during deletion.
 *
 * 1. Register a new member via `authorize_member_join` to obtain an authenticated connection.
 * 2. Create a community via `generate_random_community_platform_member_communities_create` — this creates the community and an initial icon image record.
 * 3. Extract the `communityId` and `imageId` from the created community's `icon` field.
 * 4. Call `erase` to delete the icon image using the owner's authenticated connection.
 * 5. Verify deletion succeeded by confirming no exception was thrown.
 */
export async function test_api_community_icon_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and obtain authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community (which creates an initial icon image)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Extract the IDs from the created community
  const communityId = community.id;
  const icon = community.icon;
  typia.assertGuard(icon!);
  const imageId = icon.id;
  // 4. Delete the icon image using the owner's authenticated connection
  await api.functional.communityPlatform.member.communities.images.erase(
    memberConnection,
    {
      communityId,
      imageId,
    },
  );
  // 5. Deletion succeeded — no exception was thrown
}
