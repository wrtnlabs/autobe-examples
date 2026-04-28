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
 * Test that a regular member without moderator or owner authority cannot erase a community ban.
 *
 * Validates that the PUT /member/bans/{banId} endpoint properly enforces authorization checks by rejecting attempts from members who lack moderation authority in the target community. A community owner creates a community and issues a ban against another member. A third member with no moderator role in the community then attempts to erase that ban. The system must reject this with a 403 Forbidden response, preserving the active ban state unchanged.
 *
 * This test ensures that only community moderators and owners can lift bans, preventing unauthorized members from interfering with moderation decisions regardless of their subscription status or general platform membership.
 *
 * 1. Join as the community owner who will issue the ban.
 * 2. Join as the member who will be banned.
 * 3. Join as a third member with no moderator authority.
 * 4. Owner creates a community (automatically becomes owner/moderator).
 * 5. Owner creates a ban against the target member in the community.
 * 6. Non-moderator member attempts to erase the ban.
 * 7. System rejects with 403 Forbidden — ban remains active.
 */
export async function test_api_community_ban_forbidden_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as community owner (also the moderator who will create the ban)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {},
  });
  // 2. Join as the ban target member
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {},
  });
  typia.assert(targetMember);
  // 3. Join as third member with NO moderator authority (the unauthorized actor)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {
    body: {},
  });
  // 4. Owner creates a community (automatically becomes owner/moderator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 5. Owner creates a ban against the target member
  const ban =
    await generate_random_reddit_like_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: targetMember.id },
      },
    );
  typia.assert(ban);
  // 6. Non-moderator attempts to erase the ban — should get 403 Forbidden
  const banId = ban.id;
  await TestValidator.httpError(
    "non-moderator cannot erase ban — should get 403 Forbidden",
    403,
    async () => {
      await api.functional.redditLikeCommunity.member.bans.putByBanid(
        nonModeratorConnection,
        {
          banId,
        },
      );
    },
  );
}
