import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_bans_create } from "../../../generate/generate_random_community_platform_member_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test authorization failure when a non-moderator attempts to retrieve ban details.
 * Validates that only community moderators (including owners) can view ban details.
 * 1. Owner member joins and creates community
 * 2. Non-moderator member joins
 * 3. Third member joins (to be banned)
 * 4. Owner creates ban on third member
 * 5. Non-moderator attempts to retrieve ban details → should fail with 403
 */
export async function test_api_ban_retrieval_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Non-moderator member setup
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModerator = await authorize_member_join(nonModeratorConnection, {});
  typia.assert(nonModerator);
  // 3. Third member (to be banned) setup
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {});
  typia.assert(thirdMember);
  // 4. Owner creates ban on third member
  const ban = await generate_random_community_platform_member_bans_create(
    ownerConnection,
    {
      params: { communityId: community.id },
      body: {
        memberId: thirdMember.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        expiresAt: null,
      },
    },
  );
  typia.assert(ban);
  // 5. Non-moderator attempts to retrieve ban details → should fail
  await TestValidator.httpError(
    "non-moderator cannot retrieve ban details",
    403,
    async () =>
      await api.functional.communityPlatform.member.bans.at(
        nonModeratorConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      ),
  );
}
