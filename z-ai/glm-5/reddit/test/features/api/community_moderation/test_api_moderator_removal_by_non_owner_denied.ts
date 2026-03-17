import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that a regular moderator cannot remove other moderators—only the
 * community owner has this authority.
 *
 * Steps:
 * 1. Create memberA and create a community (memberA becomes owner)
 * 2. Create memberB and add as moderatorA
 * 3. Create memberC and add as moderatorB
 * 4. MemberB (moderatorA) attempts to remove moderatorB
 * 5. Verify the request fails with 403 Forbidden
 */
export async function test_api_moderator_removal_by_non_owner_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA (will become community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. MemberA creates a community (becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create memberB (will become moderatorA)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Owner (memberA) adds memberB as moderatorA
  const moderatorA =
    await generate_random_community_platform_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { memberId: memberB.id },
      },
    );
  typia.assert(moderatorA);
  // 5. Create memberC (will become moderatorB)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // 6. Owner (memberA) adds memberC as moderatorB
  const moderatorB =
    await generate_random_community_platform_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: { memberId: memberC.id },
      },
    );
  typia.assert(moderatorB);
  // 7. ModeratorA (memberB) attempts to remove moderatorB - should fail with 403
  await TestValidator.httpError(
    "moderator cannot remove another moderator",
    403,
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.erase(
        memberBConnection,
        {
          communityId: community.id,
          moderatorId: moderatorB.id,
        },
      );
    },
  );
}
