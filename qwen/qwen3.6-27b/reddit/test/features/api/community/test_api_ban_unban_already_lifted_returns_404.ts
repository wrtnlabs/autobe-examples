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
 * Test the edge case where a moderator attempts to lift a ban that has been previously lifted.
 *
 * Verifies the idempotency check for ban lifting (unban) operations. When an already-lifted ban
 * is targeted for removal (same community, same banId), the system returns a 404 Not Found
 * response since `deleted_at` is no longer null.
 *
 * 1. Authenticate community owner.
 * 2. Create community.
 * 3. Authenticate target member to be banned.
 * 4. Create ban on target member.
 * 5. First unban (should succeed with void response).
 * 6. Second unban of same banId (should return 404 Not Found).
 */
export async function test_api_ban_unban_already_lifted_returns_404(
  connection: api.IConnection,
) {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {},
  });
  // 2. Create community
  const community: IREdditLikeCommunityCommunity =
    await api.functional.redditLikeCommunity.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate target member
  const targetConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(targetConnection, {
    body: {},
  });
  // 4. Create ban on target member
  const ban: IREdditLikeCommunityCommunityBan =
    await api.functional.redditLikeCommunity.member.communities.community_bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          member_id: String(
            (targetConnection as api.IConnection).headers![
              "Authorization"
            ]!,
          ).split(",")[0],
          reason: "test ban reason",
        } satisfies IREdditLikeCommunityCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. First unban - should succeed (void response)
  await api.functional.redditLikeCommunity.member.bans.eraseByBanid(
    ownerConnection,
    { banId: ban.id },
  );
  // 6. Second unban of same banId - should return 404 Not Found
  await TestValidator.httpError(
    "already lifted ban returns 404",
    404,
    async () => {
      await api.functional.redditLikeCommunity.member.bans.eraseByBanid(
        ownerConnection,
        { banId: ban.id },
      );
    },
  );
}