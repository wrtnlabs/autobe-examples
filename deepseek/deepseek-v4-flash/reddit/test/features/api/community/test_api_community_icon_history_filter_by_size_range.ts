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

export async function test_api_community_icon_history_filter_by_size_range(
  connection: api.IConnection,
): Promise<void> {
  // Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create a community (generates first icon with a random file size)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Upload a second icon with a different file size
  const secondIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(secondIcon);
  // Get all icon history without filters to know actual sizes
  const allIcons =
    await api.functional.communityPlatform.communities.images.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformCommunityImage.IRequest,
      },
    );
  typia.assert(allIcons);
  TestValidator.predicate("at least 2 icons exist", allIcons.data.length >= 2);
  // Find the active (newest) icon and compute size boundaries
  const activeIcon = allIcons.data.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest,
  );
  const sizes = allIcons.data.map((i) => i.size);
  const maxSize = Math.max(...sizes);
  const minSize = Math.min(...sizes);
  // Test 1: Inclusive range that should include the active icon
  const found = await api.functional.communityPlatform.communities.images.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        size_from: 0,
        size_to: activeIcon.size satisfies number as number,
      } satisfies ICommunityPlatformCommunityImage.IRequest,
    },
  );
  typia.assert(found);
  TestValidator.predicate(
    "active icon is included in size filter range",
    found.data.some((img) => img.id === activeIcon.id),
  );
  // Test 2: Range too large — no icon should have size >= maxSize + 1
  const tooLarge =
    await api.functional.communityPlatform.communities.images.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          size_from: maxSize + 1,
        } satisfies ICommunityPlatformCommunityImage.IRequest,
      },
    );
  typia.assert(tooLarge);
  TestValidator.equals(
    "too-large range returns no data",
    0,
    tooLarge.data.length,
  );
  TestValidator.equals(
    "too-large range records is 0",
    0,
    tooLarge.pagination.records,
  );
  // Test 3: Range too small — no icon should have size <= minSize - 1
  const tooSmall =
    await api.functional.communityPlatform.communities.images.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          size_to: minSize - 1,
        } satisfies ICommunityPlatformCommunityImage.IRequest,
      },
    );
  typia.assert(tooSmall);
  TestValidator.equals(
    "too-small range returns no data",
    0,
    tooSmall.data.length,
  );
  TestValidator.equals(
    "too-small range records is 0",
    0,
    tooSmall.pagination.records,
  );
}
