import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

/**
 * Test that a non-owner moderator cannot remove another moderator from a community.
 *
 * Only the community owner has authority to remove moderators. A moderator trying to remove another moderator must be rejected with 403 Forbidden. After the failed attempt, the target moderator's record must still exist in the system, confirmed by the owner successfully removing it.
 *
 * 1. Register member A (future community owner).
 * 2. Register member B (future non-owner moderator).
 * 3. Register member C (future second moderator to be targeted for removal).
 * 4. Member A creates a community and becomes its owner.
 * 5. Member A appoints member B as a moderator.
 * 6. Member A appoints member C as a moderator.
 * 7. Member B (non-owner moderator) attempts to delete moderator C's record, expecting 403 Forbidden.
 * 8. Member A (owner) deletes moderator C's record, confirming it still existed.
 */
export async function test_api_moderator_removal_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A who will be the community owner
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Register member B who will be a non-owner moderator
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 3: Register member C who will be another moderator (target for removal)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // Step 4: Member A creates a community and becomes its owner
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 5: Member A appoints member B as a moderator
  const moderatorB =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(moderatorB);
  // Step 6: Member A appoints member C as a moderator
  const moderatorC =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberC.username,
        },
      },
    );
  typia.assert(moderatorC);
  // Step 7: Member B (non-owner moderator) tries to remove member C — expect 403 Forbidden
  await TestValidator.httpError(
    "non-owner moderator cannot remove another moderator",
    403,
    async () => {
      await api.functional.communityPlatform.member.moderators.erase(
        memberBConnection,
        {
          moderatorId: moderatorC.id,
        },
      );
    },
  );
  // Step 8: Verify member C's moderator record still exists by having the owner successfully remove it
  await api.functional.communityPlatform.member.moderators.erase(
    memberAConnection,
    {
      moderatorId: moderatorC.id,
    },
  );
}
