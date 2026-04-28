import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test scope enforcement when communityId path parameter does not match the ban's actual parent community.
 *
 * Validates that ban records are strictly scoped to their issuing community by verifying that the server detects mismatches between the communityId path parameter and the ban's internal reddit_like_community_community_id foreign key. When a mismatch is detected, the endpoint must return 404 Not Found.
 *
 * 1. Authenticate first member (community creator / moderator).
 * 2. Authenticate second member as the ban target.
 * 3. Create first community where the ban record will live.
 * 4. Create second community that will be used as mismatched communityId.
 * 5. Create ban in first community banning the second member.
 * 6. Attempt GET /communities/{secondCommunityId}/community-bans/{banId} expecting 404.
 */
export async function test_api_community_ban_scope_mismatch_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member (creator / moderator)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(creatorAuth);
  // 2. Authenticate second member (ban target)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(targetAuth);
  // 3. Create first community (where ban will be created)
  const communityA =
    await generate_random_reddit_like_community_member_communities_create(
      creatorConnection,
      { body: {} },
    );
  typia.assert(communityA);
  // 4. Create second community (mismatched communityId for the test)
  const communityB =
    await generate_random_reddit_like_community_member_communities_create(
      creatorConnection,
      { body: {} },
    );
  typia.assert(communityB);
  // Verify communities are different
  TestValidator.notEquals(
    "communities have different IDs",
    communityA.id,
    communityB.id,
  );
  // 5. Create ban in first community banning second member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      creatorConnection,
      {
        params: { communityId: communityA.id },
        body: {
          member_id: targetAuth.id,
        },
      },
    );
  typia.assert(ban);
  // 6. Attempt GET with second community's ID → should return 404 (scope mismatch)
  await TestValidator.httpError(
    "returns 404 on community scope mismatch",
    404,
    async () =>
      await api.functional.redditLikeCommunity.communities.community_bans.at(
        creatorConnection,
        {
          communityId: communityB.id,
          communityBanId: ban.id,
        },
      ),
  );
}
