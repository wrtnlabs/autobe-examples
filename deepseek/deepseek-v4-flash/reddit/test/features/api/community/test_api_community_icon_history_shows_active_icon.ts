import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityImage";
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

export async function test_api_community_icon_history_shows_active_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community with its first icon image
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Upload a second icon image (soft-deletes the first one)
  const secondIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(secondIcon);
  // 4. Upload a third icon image (soft-deletes the second one — only this remains active)
  const thirdIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(thirdIcon);
  // 5. List the community's icon image history (should exclude soft-deleted records)
  const page = await api.functional.communityPlatform.communities.images.index(
    memberConnection,
    {
      communityId: community.id,
      body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(page);
  // 6. Verify only the active (most recent) icon is returned
  TestValidator.equals("active icon count", page.data.length, 1);
  TestValidator.equals(
    "active icon id matches most recent upload",
    page.data[0]!.id,
    thirdIcon.id,
  );
  TestValidator.equals(
    "active icon created_at matches most recent upload",
    page.data[0]!.created_at,
    thirdIcon.created_at,
  );
  // 7. Verify pagination metadata
  TestValidator.equals("pagination current", page.pagination.current, 1);
  TestValidator.equals("pagination records", page.pagination.records, 1);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
}
