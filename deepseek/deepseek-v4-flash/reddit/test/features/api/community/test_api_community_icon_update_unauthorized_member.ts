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

export async function test_api_community_icon_update_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a regular member (neither owner nor moderator) receives a 403
   * AuthorizationFailure when attempting to update a community's icon image
   * via PUT /communityPlatform/member/communities/{communityId}/images/{imageId}.
   *
   * 1. Join as memberA and create a community, becoming its owner.
   * 2. Upload an initial icon image for the community as memberA.
   * 3. Join as memberB (separate member with no moderation role).
   * 4. As memberB, attempt to update the icon image — expect 403 Forbidden.
   */
  // Step 1: Join as memberA (will be the community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const _memberA = await authorize_member_join(memberAConnection, {});
  // Step 2: Create a community as memberA
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // Step 3: Upload an initial icon image as memberA (owner)
  const image =
    await generate_random_community_platform_member_communities_images_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Join as memberB (unauthorized member with no moderation role)
  const memberBConnection: api.IConnection = { host: connection.host };
  const _memberB = await authorize_member_join(memberBConnection, {});
  // Step 5: Attempt to update the icon image as memberB (expected: 403 Forbidden)
  const updateBody = typia.random<ICommunityPlatformCommunityImage.IUpdate>();
  await TestValidator.httpError(
    "unauthorized member cannot update community icon",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.images.update(
        memberBConnection,
        {
          communityId: community.id,
          imageId: image.id,
          body: updateBody,
        },
      );
    },
  );
}
