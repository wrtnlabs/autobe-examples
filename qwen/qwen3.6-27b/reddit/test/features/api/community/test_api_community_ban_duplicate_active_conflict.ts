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
 * Test community ban duplicate active conflict - banning an already banned member.
 *
 * Validates that the community ban system properly enforces the constraint that only one active ban can exist per community-member pair. When a community moderator or owner attempts to ban a member who already has an active ban in that community, the second ban request must be rejected with a conflict error.
 *
 * This ensures the database unique constraint on active bans is enforced at the API level, preventing data integrity violations and maintaining a clear ban record for moderation review.
 *
 * 1. Register two member accounts - community owner and target member to be banned.
 * 2. Community owner creates a new community, gaining automatic moderator authority.
 * 3. Community owner bans the target member with an initial ban reason (first ban succeeds).
 * 4. Community owner attempts to ban the same member again with a different reason.
 * 5. Verify the second ban attempt is rejected with HTTP 409 Conflict due to duplicate active ban.
 * 6. Verify the original ban record remains active (deleted_at is null).
 */
export async function test_api_community_ban_duplicate_active_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(ownerAuth);
  // 2. Register target member who will be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {},
  });
  typia.assert(targetAuth);
  // 3. Create community as owner (owner gains moderator authority automatically)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. First ban - ban the target member (should succeed)
  const body1 = {
    member_id: targetAuth.id,
    reason: "Repetitive spam posting",
  } satisfies IREdditLikeCommunityCommunityBan.ICreate;
  const ban1 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        body: body1,
        params: { communityId: community.id },
      },
    );
  typia.assert(ban1);
  // 5. Second ban - attempt to ban same member again with different reason (should fail)
  const body2 = {
    member_id: targetAuth.id,
    reason: "Harassing other members",
  } satisfies IREdditLikeCommunityCommunityBan.ICreate;
  await TestValidator.httpError(
    "duplicate active ban should return 409 conflict",
    409,
    async () => {
      await generate_random_reddit_like_community_member_communities_community_bans_create(
        ownerConnection,
        {
          body: body2,
          params: { communityId: community.id },
        },
      );
    },
  );
  // 6. Verify original ban is still active (deleted_at is null)
  TestValidator.predicate(
    "original ban remains active",
    ban1.deleted_at === null,
  );
}
