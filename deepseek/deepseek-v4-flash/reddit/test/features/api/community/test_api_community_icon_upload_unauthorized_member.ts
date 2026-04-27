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
 * Test that a regular member who is neither the community owner nor an appointed moderator receives a 403 Forbidden response when attempting to upload a community icon.
 *
 * Validates the authorization guard on the community icon upload endpoint. Only the community owner and appointed moderators are authorized to upload new icon images. A regular member with no ownership or moderation privileges must be rejected with a 403 status code and the community's current icon must remain unchanged.
 *
 * 1. Register Member A (owner) and create a community.
 * 2. Register Member C (unauthorized regular member).
 * 3. Member C attempts to upload an icon image for the community, expects 403 Forbidden.
 */
export async function test_api_community_icon_upload_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (owner) and create a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Register Member C (unauthorized regular member)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // Step 3: Member C attempts to upload an icon image -> must be rejected with 403
  await TestValidator.httpError(
    "unauthorized member cannot upload community icon",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.images.create(
        memberCConnection,
        {
          communityId: community.id,
          body: typia.random<ICommunityPlatformCommunityImage.ICreate>(),
        },
      );
    },
  );
}
