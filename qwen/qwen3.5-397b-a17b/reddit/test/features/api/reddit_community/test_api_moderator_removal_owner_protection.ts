import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test the protection mechanism that prevents removal of the community owner.
 *
 * Validates that the community owner cannot be removed from their moderator role, even by themselves. This protection ensures that a community always maintains its ultimate authority figure and cannot be left without an owner.
 *
 * The test creates a member account, establishes community ownership by creating a community, then attempts to remove the owner's own moderator assignment. The system must reject this attempt with a 400 Bad Request error to prevent communities from losing their administrative continuity.
 *
 * 1. Member joins and authenticates (becomes future community owner).
 * 2. Member creates a new community (automatically assigned owner role).
 * 3. Owner attempts to remove their own moderator record using the erase endpoint.
 * 4. Validates the system rejects the request with appropriate error response.
 *
 * Edge Cases Covered:
 * - Self-removal attempt by owner (primary protection scenario)
 * - Ensures community always has an owner for administrative continuity
 * - Verifies owner role cannot be deleted through the moderator removal API
 */
export async function test_api_moderator_removal_owner_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authenticates via member join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a new community (automatically becomes owner with owner role)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // Verify the owner is correctly set
  TestValidator.equals(
    "community owner matches creator",
    community.owner.id,
    owner.id,
  );
  // 3. Owner attempts to remove their own moderator assignment (the owner record)
  // 4. Verify the system rejects the request with appropriate error
  await TestValidator.error("owner removal blocked", async () => {
    await api.functional.redditCommunity.member.communities.moderators.erase(
      ownerConnection,
      {
        communityId: community.id,
        moderatorId: owner.id,
      },
    );
  });
}
