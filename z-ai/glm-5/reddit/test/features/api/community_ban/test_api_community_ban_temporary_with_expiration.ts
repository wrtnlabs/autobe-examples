import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test banning a member with a temporary expiration date.
 *
 * This test validates that a community moderator can issue a temporary ban
 * with a specific expiration timestamp. The ban should:
 * - Store the reason correctly
 * - Set the expiredAt field to the specified future timestamp
 * - Mark the ban as temporary (expiredAt is not null)
 *
 * Flow:
 * 1. Owner account creation and authentication
 * 2. Community creation (owner becomes owner automatically)
 * 3. Target user account creation
 * 4. Target user subscribes to the community
 * 5. Owner bans target user with a 7-day expiration
 */
export async function test_api_community_ban_temporary_with_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(owner);
  // Step 2: Create a community (owner becomes the community owner)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // Step 3: Create target user account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_member_join(targetConnection, {
    body: {
      username: `target_${RandomGenerator.alphaNumeric(8)}`,
    },
  });
  typia.assert(targetUser);
  // Step 4: Target user subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      targetConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // Step 5: Owner bans target user with a 7-day expiration
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const now = new Date();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const expirationDate = new Date(now.getTime() + sevenDaysInMs);
  const expiredAtIso = expirationDate.toISOString();
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        username: targetUser.username,
        reason: banReason,
        expired_at: expiredAtIso,
      },
    },
  );
  typia.assert(ban);
  // Validation: reason is stored correctly
  TestValidator.equals("ban reason is stored", ban.reason, banReason);
  // Validation: expiredAt is set (not null) - marking it as temporary
  TestValidator.predicate("ban is temporary", ban.expiredAt !== null);
  // Validation: expiredAt matches the specified timestamp (with tolerance for milliseconds)
  const expectedExpiredAt = new Date(expiredAtIso).getTime();
  const actualExpiredAt = new Date(ban.expiredAt!).getTime();
  TestValidator.predicate(
    "expiredAt matches specified timestamp",
    Math.abs(expectedExpiredAt - actualExpiredAt) < 1000,
  );
  // Validation: banned member matches target user
  TestValidator.equals(
    "banned member username",
    ban.member.username,
    targetUser.username,
  );
  // Validation: bannedBy is the owner
  TestValidator.equals(
    "bannedBy is owner",
    ban.bannedBy.username,
    owner.username,
  );
  // Validation: community matches
  TestValidator.equals("community name", ban.community.name, community.name);
}
