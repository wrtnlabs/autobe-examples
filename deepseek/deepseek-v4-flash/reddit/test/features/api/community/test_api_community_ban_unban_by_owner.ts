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
 * Test that a community owner can successfully unban a previously banned member.
 *
 * Validates the complete unban workflow: creating a community as the owner, banning
 * a second member from that community, then lifting the ban via the erase endpoint.
 * Verifies that the ban record is permanently removed by attempting to delete the
 * same ban ID again — the second attempt must return 404 since the record is gone.
 *
 * 1. Register Member A as an authenticated member.
 * 2. Register Member B as a second authenticated member.
 * 3. Member A creates a community, becoming its owner.
 * 4. Member A bans Member B from the community with a reason.
 * 5. Member A unbans Member B via DELETE /communityPlatform/member/community-bans/{banId}.
 * 6. Validates the ban is hard-deleted by attempting to delete again (expect 404).
 */
export async function test_api_community_ban_unban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Register Member B (will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Create a community as Member A (Member A becomes the owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Ban Member B from the community (as Member A — the owner)
  const ban =
    await generate_random_community_platform_member_community_bans_create(
      memberAConnection,
      {
        body: {
          communityCode: community.name,
          memberCode: memberB.username,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(ban);
  // 5. Unban Member B as the community owner (first call succeeds)
  await api.functional.communityPlatform.member.community_bans.erase(
    memberAConnection,
    {
      banId: ban.id,
    },
  );
  // 6. Verify the ban record is hard-deleted — second delete attempt returns 404
  await TestValidator.httpError("ban record hard-deleted", 404, async () => {
    await api.functional.communityPlatform.member.community_bans.erase(
      memberAConnection,
      {
        banId: ban.id,
      },
    );
  });
}
