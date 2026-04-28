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
 * Test community owner erases an active ban on a member, restoring their posting abilities.
 *
 * Validates the complete unban workflow: owner authentication, target member setup, community creation with owner authority, ban creation, and ban erasure. Verifies the response contains the deleted_at timestamp confirming the restriction is lifted while preserving original attribution fields.
 *
 * 1. Owner authenticates via member join utility establishing moderation authority.
 * 2. Banned member authenticates separately to create distinct target account.
 * 3. Community created using owner connection with generation utility.
 * 4. Active ban created on the member within the community using generation utility.
 * 5. Owner erases the ban by UUID through the ban endpoint.
 * 6. Validates deleted_at is populated, banned member preserved, community association maintained.
 */
export async function test_api_community_ban_owner_erases_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner with full moderation authority
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(ownerMember);
  // 2. Authenticate as member to be banned (target of ban)
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedMember: IREdditLikeCommunityMember.IAuthorized =
    await authorize_member_join(bannedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(bannedMember);
  // 3. Create a community where owner automatically receives highest moderation authority
  const community: IREdditLikeCommunityCommunity =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Create an active ban record on the banned member within the community
  const ban: IREdditLikeCommunityCommunityBan =
    await generate_random_reddit_like_community_member_communities_bans_create(
      ownerConnection,
      {
        body: { member_id: bannedMember.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(ban);
  // 5. Erase the active ban using the owner's connection and the ban's UUID
  const erasedBan: IRedditLikeCommunityBan =
    await api.functional.redditLikeCommunity.member.bans.putByBanid(
      ownerConnection,
      {
        banId: ban.id,
      },
    );
  typia.assert(erasedBan);
  // 6. Validate ban erase response: deleted_at is populated (ban is lifted)
  const deletedAt: string & tags.Format<"date-time"> = (erasedBan.deleted_at ??
    "") satisfies string & tags.Format<"date-time">;
  TestValidator.notEquals("deleted_at is populated", deletedAt, "");
  TestValidator.equals(
    "banned member preserved",
    erasedBan.bannedMember.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "community preserved",
    erasedBan.community.id,
    community.id,
  );
}
