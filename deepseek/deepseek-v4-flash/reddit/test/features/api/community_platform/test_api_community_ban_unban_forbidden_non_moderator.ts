import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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
import { generate_random_community_platform_member_community_bans_create } from "../../../generate/generate_random_community_platform_member_community_bans_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a regular non-moderator member cannot unban a user from a community.
 *
 * Only the community owner and appointed moderators have authority to remove ban
 * records. A regular member attempting to unban should receive a 403 Forbidden
 * response, and the ban record must remain intact.
 *
 * The 403 (not 404) confirms the ban record exists — a 404 would indicate a
 * missing ban, while 403 indicates the server found the ban but rejected the
 * caller for lacking moderator authority.
 *
 * 1. Register Member A (community owner) via authorize_member_join.
 * 2. Member A creates a community via generate_random_community_platform_member_communities_create.
 * 3. Register Member B (will be banned) via authorize_member_join.
 * 4. Register Member C (regular non-moderator) via authorize_member_join.
 * 5. Member A bans Member B via generate_random_community_platform_member_community_bans_create.
 * 6. Member C attempts to unban via api.functional.communityPlatform.member.community_bans.erase — expect 403.
 * 7. The 403 status confirms the ban still exists (not 404 Not Found).
 */
export async function test_api_community_ban_unban_forbidden_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community — Member A becomes owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register Member B (will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Register Member C (regular member, will attempt unauthorized unban)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 5. As Member A (owner), ban Member B
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      memberAConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: memberB.username,
          reason: "Violation of community guidelines",
        },
      },
    );
  typia.assert(ban);
  // 6. As Member C (non-moderator), attempt to unban — expect 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot unban a member from a community",
    403,
    async () => {
      await api.functional.communityPlatform.member.community_bans.erase(
        memberCConnection,
        { banId: ban.id },
      );
    },
  );
}
