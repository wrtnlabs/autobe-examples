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

export async function test_api_community_icon_deletion_fallback_to_previous(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community with its initial icon (icon 1)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const image1 = typia.assert(community.icon!);
  // Step 3: Upload a second icon (icon 2) — this becomes the active icon
  const image2 =
    await generate_random_community_platform_member_communities_images_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(image2);
  // Step 4: Verify icon 2 is newer than icon 1
  TestValidator.predicate(
    "second icon created after first icon",
    () =>
      new Date(image2.created_at).getTime() >
      new Date(image1.created_at).getTime(),
  );
  // Step 5: Delete the latest icon (icon 2) — triggers fallback to icon 1
  const erased =
    await api.functional.communityPlatform.member.communities.images.erase(
      memberConnection,
      {
        communityId: community.id,
        imageId: image2.id,
      },
    );
  typia.assert(erased);
}
