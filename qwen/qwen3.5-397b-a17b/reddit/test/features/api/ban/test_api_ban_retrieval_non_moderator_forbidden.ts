import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a non-moderator member cannot retrieve ban details from a community they don't moderate.
 *
 * Validates the authorization business rule that only moderators and owners can access ban information for audit and oversight purposes. The test ensures that regular community members without moderation privileges are properly restricted from viewing ban records.
 *
 * 1. Member A registers and becomes community owner.
 * 2. Member A creates a community (automatically becomes owner).
 * 3. Member B registers as a regular member (not a moderator).
 * 4. Member C registers as the user who will be banned.
 * 5. Member A (owner) creates a ban on member C.
 * 6. Member B attempts to retrieve the ban details.
 * 7. Validates that member B's request fails with 403 Forbidden because they lack moderator or owner privileges.
 */
export async function test_api_ban_retrieval_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (owner) registration
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  // 2. Create community (owner becomes community owner automatically)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Member B (regular member, not moderator) registration
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Member C (user to be banned) registration
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {});
  // 5. Member A (owner) creates a ban on member C
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_community_member_id: memberCAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Member B (non-moderator) attempts to retrieve ban details - should fail with 403
  await TestValidator.error(
    "non-moderator cannot access ban details",
    async () => {
      await api.functional.redditCommunity.member.communities.bans.at(
        memberBConnection,
        {
          communityId: community.id,
          banId: ban.id,
        },
      );
    },
  );
}
