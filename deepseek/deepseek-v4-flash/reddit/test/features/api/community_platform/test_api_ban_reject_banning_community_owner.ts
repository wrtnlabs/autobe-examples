import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_communities_bans_create } from "../../../generate/generate_random_community_platform_member_communities_bans_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_ban } from "../../../prepare/prepare_random_community_platform_ban";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that attempting to ban the community owner from their own community is rejected per business rule (Section 214).
 *
 * First, join as member A and create a community (A becomes owner). Join as member B and have owner A appoint B as moderator. Authenticate as moderator B, and attempt to ban the owner A from their own community. Validates that the request is rejected with an error response.
 *
 * Additionally verifies that moderator B's authority remains intact by successfully banning a non-owner member C. This confirms the ban rejection is specific to the owner, not a general authorization failure.
 *
 * 1. Member A registers and creates a community (A becomes owner).
 * 2. Member B registers and is appointed as moderator by owner A.
 * 3. Moderator B attempts to ban owner A → error expected (not HTTP 201).
 * 4. Moderator B successfully bans non-owner member C → verifies authority is intact.
 */
export async function test_api_ban_reject_banning_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (will become community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (A becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Register member B (will become moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Owner A appoints member B as moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(moderator);
  // 5. Moderator B attempts to ban owner A → must be rejected (Section 214)
  await TestValidator.httpError(
    "banning community owner should be rejected",
    [400, 403, 422],
    async () => {
      await generate_random_community_platform_member_communities_bans_create(
        memberBConnection,
        {
          body: {
            member_id: memberA.id,
            reason: "attempting to ban the owner from their own community",
          },
          params: {
            communityName: community.name,
          },
        },
      );
    },
  );
  // 6. Register member C (non-owner) and verify moderator B can ban them
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  const banOnMemberC =
    await generate_random_community_platform_member_communities_bans_create(
      memberBConnection,
      {
        body: {
          member_id: memberC.id,
          reason: "test reason for banning non-owner member C",
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banOnMemberC);
  TestValidator.equals(
    "banned member is member C",
    banOnMemberC.bannedMember.id,
    memberC.id,
  );
}
