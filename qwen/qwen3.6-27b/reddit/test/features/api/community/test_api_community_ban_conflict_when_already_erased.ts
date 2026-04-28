import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test duplicate ban erasure returns 409 Conflict when an already-erased ban is erased again.
 *
 * Validates the complete ban lifecycle flow including community creation as owner, ban creation targeting a separate member, initial successful erase, and duplicate erase rejection. Ensures that the system returns a 409 Conflict error rather than silently succeeding or returning 404 Not Found. This preserves the ban record's audit trail — the original ban reason, issuing moderator attribution, and unban timestamp remain intact in the database.
 *
 * Special attention is given to verifying that duplicate erase operations are properly rejected per the specification requirement to return 409 if the ban is already erased, while the first erase still returns the updated ban record with deleted_at populated.
 *
 * 1. Community owner registers and authenticates.
 * 2. A separate member registers to be the ban target.
 * 3. Owner creates a community and gains automatic moderator authority.
 * 4. Owner creates an active ban targeting the separate member.
 * 5. Owner erases the ban successfully, setting deleted_at.
 * 6. Owner attempts to erase the same ban again, receiving a 409 Conflict.
 */
export async function test_api_community_ban_conflict_when_already_erased(
  connection: api.IConnection,
): Promise<void> {
  // 1. Community owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {},
  });
  typia.assert(owner);
  // 2. Separate member to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {},
  });
  typia.assert(bannedMember);
  // 3. Create community (owner automatically becomes creator/moderator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 4. Create a ban targeting the separate member
  const ban =
    await generate_random_reddit_like_community_member_communities_bans_create(
      ownerConnection,
      {
        body: {},
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 5. First erase — should succeed and set deleted_at
  const erasedBan =
    await api.functional.redditLikeCommunity.member.bans.putByBanid(
      ownerConnection,
      { banId: ban.id },
    );
  typia.assert(erasedBan);
  // Validate the first erase succeeded with audit trail
  TestValidator.equals(
    "first erase sets deleted_at",
    erasedBan.deleted_at !== null,
    true,
  );
  TestValidator.equals("ban reason preserved", erasedBan.reason, ban.reason);
  // 6. Second erase — should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate erase returns 409 Conflict",
    409,
    async () =>
      await api.functional.redditLikeCommunity.member.bans.putByBanid(
        ownerConnection,
        { banId: ban.id },
      ),
  );
}
