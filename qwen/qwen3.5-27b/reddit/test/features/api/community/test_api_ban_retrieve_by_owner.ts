import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community owner can retrieve ban records in their community.
 *
 * This test verifies:
 * 1. A community owner (who created the community) has full authority to view all ban records
 * 2. The owner can access ban details regardless of which moderator created the ban
 * 3. The response includes complete ban information including the banned member's details,
 *    ban reason if provided, and all timestamps
 * 4. Community owners have full moderation oversight capabilities
 */
export async function test_api_ban_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create second member (to be banned)
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedMemberAuth);
  // 4. Create ban record for the second member in the community
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: bannedMemberAuth.id,
        reason: "Violation of community guidelines",
      },
    },
  );
  typia.assert(ban);
  // 5. Retrieve the ban record as community owner
  const retrievedBan = await api.functional.redditClone.communities.bans.at(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate ban record details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned member username matches",
    retrievedBan.member.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.reason,
    "Violation of community guidelines",
  );
  TestValidator.predicate(
    "banned_at is present",
    retrievedBan.banned_at !== null && retrievedBan.banned_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    retrievedBan.created_at !== null && retrievedBan.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    retrievedBan.updated_at !== null && retrievedBan.updated_at.length > 0,
  );
  TestValidator.equals(
    "lifted_at is null (active ban)",
    retrievedBan.lifted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    retrievedBan.deleted_at,
    null,
  );
}
