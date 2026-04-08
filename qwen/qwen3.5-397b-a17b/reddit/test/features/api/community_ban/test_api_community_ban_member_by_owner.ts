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
 * Test community owner banning a member from their community.
 *
 * Validates the complete ban workflow including owner authentication, community creation, target member registration, and ban enforcement. Ensures that the ban record is correctly created with proper references to the community, banned member, and issuer (owner).
 *
 * Special attention is given to verifying that the ban status is 'active', the reason is properly documented, and all entity references (community_id, member_id, issuer_id) are correctly maintained.
 *
 * 1. Member A (owner) registers and authenticates.
 * 2. Member A creates a community they own.
 * 3. Member B (target) registers as a separate member.
 * 4. Member A creates a ban against Member B with status 'active' and documented reason.
 * 5. Validates ban record contains correct community reference, member reference, issuer reference, reason, and active status.
 */
export async function test_api_community_ban_member_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (owner) joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Member B (target) joins
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuth);
  // 4. Owner creates ban against target member
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: {
          reddit_community_member_id: targetAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("community matches", ban.community.id, community.id);
  TestValidator.equals("banned member matches", ban.member.id, targetAuth.id);
  TestValidator.equals("issuer matches owner", ban.issuer.id, ownerAuth.id);
  TestValidator.predicate("status is active", ban.status === "active");
  TestValidator.predicate("reason is documented", ban.reason.length > 0);
}
