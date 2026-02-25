import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test scenario: Moderator attempts to unban another moderator (should fail with 403)
 *
 * Business Workflow:
 * 1. Owner creates a community with two moderators
 * 2. One moderator bans the other moderator
 * 3. First moderator (who banned the second) tries to unban them
 * 4. Verify operation fails with 403 Forbidden
 *
 * Authorization Constraint Validation:
 * - Moderator1 JWT token is valid
 * - Moderator1 is verified as community moderator (exists in community_moderators)
 * - Moderator1 is NOT the owner (is_owner=false)
 * - Target (moderator2) IS a moderator (is_owner=false)
 * - Authorization FAILS: Only owner can unban moderators
 */
export async function test_api_community_ban_removal_unauthorized_for_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
    },
  });
  typia.assert(owner);
  // Step 2: Create moderator1 account
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_member_join(moderator1Connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
    },
  });
  typia.assert(moderator1);
  // Step 3: Create moderator2 account
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_member_join(moderator2Connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password: `Password${RandomGenerator.alphaNumeric(6)}1!`,
    },
  });
  typia.assert(moderator2);
  // Step 4: Owner creates a community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(15),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // Step 5: Owner appoints moderator1 as moderator
  const moderator1Record =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator1.username },
      },
    );
  typia.assert(moderator1Record);
  // Step 6: Owner appoints moderator2 as moderator
  const moderator2Record =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderator2.username },
      },
    );
  typia.assert(moderator2Record);
  // Step 7: Moderator1 bans moderator2
  const ban = await generate_random_community_member_communities_bans_create(
    moderator1Connection,
    {
      params: { communityName: community.name },
      body: {
        username: moderator2.username,
        reason: "Test ban for authorization test",
      },
    },
  );
  typia.assert(ban);
  // Verify ban was created
  TestValidator.equals("ban id exists", typeof ban.id, "string");
  TestValidator.equals(
    "banned member is moderator2",
    ban.member.username,
    moderator2.username,
  );
  TestValidator.equals(
    "banner is moderator1",
    ban.bannedBy.username,
    moderator1.username,
  );
  // Step 8: Moderator1 (not owner) attempts to unban moderator2
  // This should fail with 403 because only owner can unban moderators
  await TestValidator.httpError(
    "moderator cannot unban another moderator",
    403,
    async () => {
      await api.functional.community.member.communities.bans.erase(
        moderator1Connection,
        {
          communityName: community.name,
          banId: ban.id,
        },
      );
    },
  );
}
