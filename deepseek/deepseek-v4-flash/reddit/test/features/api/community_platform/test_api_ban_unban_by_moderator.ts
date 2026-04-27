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
 * Test that a moderator (appointed by the owner) has authority to unban a member from a community.
 *
 * Verifies the complete ban/unban workflow through a moderator's perspective. Ensures that a moderator-level user can lift a ban they placed, and that the ban record is hard-deleted (allowing a new ban for the same user-community pair).
 *
 * 1. Member A (Owner) registers and creates a community.
 * 2. Member B registers and is appointed as a moderator by Member A.
 * 3. Member C registers.
 * 4. Member B bans Member C from the community.
 * 5. Member B unbans Member C via DELETE /member/bans/:banId.
 * 6. Verifies the ban is lifted by successfully re-banning Member C — the hard-deleted ban record no longer blocks a fresh ban.
 */
export async function test_api_ban_unban_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (Owner) registers and creates a community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member B (Moderator) registers
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A appoints Member B as a moderator of the community
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
  // 4. Member C registers
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 5. Member B (moderator) bans Member C from the community
  const ban =
    await generate_random_community_platform_member_communities_bans_create(
      memberBConnection,
      {
        body: {
          member_id: memberC.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(ban);
  // 6. Member B unbans Member C via DELETE /member/bans/:banId
  const eraseResult = await api.functional.communityPlatform.member.bans.erase(
    memberBConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(eraseResult);
  // 7. Verify the ban was hard-deleted by successfully re-banning the same user
  // (A fresh ban succeeds because the previous ban record no longer exists)
  const newBan =
    await generate_random_community_platform_member_communities_bans_create(
      memberBConnection,
      {
        body: {
          member_id: memberC.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(newBan);
}
