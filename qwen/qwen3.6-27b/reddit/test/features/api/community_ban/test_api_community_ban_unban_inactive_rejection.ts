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
 * Test that erasing an already-erased community ban is properly rejected.
 *
 * Validates duplicate erase protection by creating a ban, successfully erasing it once, then attempting a second erase with the same identifiers. The system must reject the second erase because the ban record's deleted_at timestamp is already populated from the first erasure.
 *
 * This ensures the system prevents duplicate state transitions on soft-deleted ban records, maintaining data integrity and proper moderation audit trails.
 *
 * 1. Community owner authenticates and creates a community.
 * 2. Second member (ban target) authenticates separately.
 * 3. Owner bans the second member with a reason.
 * 4. Owner erases the ban successfully (first erase).
 * 5. Owner attempts to erase the same ban again - must fail.
 */
export async function test_api_community_ban_unban_inactive_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(ownerAuth);
  // 2. Create a community owned by the owner
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Authenticate second member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {},
  });
  typia.assert(bannedMemberAuth);
  // 4. Owner bans the second member
  const ban =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: bannedMemberAuth.id },
      },
    );
  typia.assert(ban);
  TestValidator.equals(
    "ban is active (deleted_at is null)",
    ban.deleted_at,
    null,
  );
  // 5. Erase the ban successfully (first erase)
  await api.functional.redditLikeCommunity.member.communities.community_bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      communityBanId: ban.id,
    },
  );
  // 6. Attempt to erase the same ban again - must fail because ban is already deleted
  await TestValidator.error(
    "double erase of community ban is rejected",
    async () => {
      await api.functional.redditLikeCommunity.member.communities.community_bans.erase(
        ownerConnection,
        {
          communityId: community.id,
          communityBanId: ban.id,
        },
      );
    },
  );
}
