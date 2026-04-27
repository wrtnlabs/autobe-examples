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
 * Test that attempting to unban with a non-existent banId returns a 404 Not Found error.
 *
 * Validates the 404 error handling path of the community ban erase endpoint. Ensures that when a valid community moderator calls the endpoint with a ban ID that does not correspond to any existing ban record, the server responds with a 404 Not Found status rather than a different error code or success.
 *
 * A member is registered and a community is created so that the caller holds moderator authority (community owner), which is a prerequisite checked by the erase endpoint before the ban existence check is performed.
 *
 * 1. Register Member A via authorize_member_join utility.
 * 2. Create a community via generate_random_community_platform_member_communities_create utility.
 * 3. Call DELETE /communityPlatform/member/community-bans/{banId} with a random UUID that does not exist.
 * 4. Verify the server responds with HTTP 404 Not Found.
 */
export async function test_api_community_ban_unban_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community owner with moderation authority)
  const memberAConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberAConnection, {});
  typia.assert(authorized);
  // 2. Create a community so Member A has a moderation role (owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Attempt to unban a non-existent ban record — expect 404 Not Found
  await TestValidator.httpError(
    "unban with non-existent banId",
    404,
    async () => {
      await api.functional.communityPlatform.member.community_bans.erase(
        memberAConnection,
        {
          banId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
