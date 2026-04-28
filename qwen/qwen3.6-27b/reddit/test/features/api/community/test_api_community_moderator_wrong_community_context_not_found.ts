import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";

/**
 * Test cross-community foreign key scoping protection for moderator retrieval.
 *
 * Validates that moderator assignments cannot be retrieved via an incorrect community context. A moderator assignment created within Community A cannot be accessed using Community B's communityId, even with the valid moderator assignment ID.
 *
 * Special attention is given to the FK constraint validation: the system must reject GET requests where the moderatorId does not belong to the specified communityId, returning 404 Not Found per specification.
 *
 * 1. Register Member A and authenticate.
 * 2. Member A creates Community A.
 * 3. Register Member B and authenticate.
 * 4. Member B creates Community B (separate from Community A).
 * 5. Member A appoints Member B as moderator for Community A (creates assignment linked to Community A's context).
 * 6. Verify moderator assignment exists by retrieving it with correct Community A communityId.
 * 7. Attempt to retrieve the same moderator using Community B's communityId — must return 404 Not Found due to FK scoping mismatch.
 */
export async function test_api_community_moderator_wrong_community_context_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (community creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, { body: {} });
  typia.assert(memberA);
  // 2. Member A creates Community A
  const communityA =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(communityA);
  // 3. Register and authenticate Member B (separate community owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, { body: {} });
  typia.assert(memberB);
  // 4. Member B creates Community B as isolated context
  const communityB =
    await generate_random_reddit_like_community_member_communities_create(
      memberBConnection,
      { body: {} },
    );
  typia.assert(communityB);
  // Validate communities are distinct
  TestValidator.notEquals(
    "communities have different IDs",
    communityA.id,
    communityB.id,
  );
  // 5. Member A appoints Member B as moderator for Community A
  const moderatorAssign =
    await generate_random_reddit_like_community_member_moderators_create(
      memberAConnection,
      {
        body: {
          member_id: memberB.id,
          community_id: communityA.id,
        },
      },
    );
  typia.assert(moderatorAssign);
  // 6. Verify moderator assignment exists via correct Community A context
  const moderatorFromA =
    await api.functional.redditLikeCommunity.communities.community_moderators.at(
      memberAConnection,
      {
        communityId: communityA.id,
        communityModeratorId: moderatorAssign.id,
      },
    );
  typia.assert(moderatorFromA);
  TestValidator.equals(
    "moderator assignment ID matches",
    moderatorFromA.id,
    moderatorAssign.id,
  );
  // 7. Attempt retrieval via wrong community context (Community B) — must return 404
  await TestValidator.error(
    "404 when accessing moderator with wrong community context",
    async () => {
      await api.functional.redditLikeCommunity.communities.community_moderators.at(
        memberBConnection,
        {
          communityId: communityB.id,
          communityModeratorId: moderatorAssign.id,
        },
      );
    },
  );
}
