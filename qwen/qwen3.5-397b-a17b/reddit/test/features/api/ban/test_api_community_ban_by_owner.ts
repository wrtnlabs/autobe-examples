import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
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
 * Test the primary success path where a community owner bans a user from their community.
 *
 * Test Steps:
 * 1. Create a member account who will become the community owner
 * 2. Create a community with a unique name (owner becomes the creator)
 * 3. Create another member account who will be banned
 * 4. As the community owner, ban the second member from the community with an optional reason
 * 5. Verify the ban record is created with correct details including banned member, banning moderator (owner), community, reason, and timestamps
 * 6. Verify the banned user's deleted_at is null indicating active ban
 *
 * Business Validations:
 * - Ban record contains correct community reference
 * - Ban record contains correct banned member reference
 * - Ban record contains correct banned_by reference (the owner)
 * - Optional reason is stored correctly
 * - created_at and updated_at timestamps are set
 * - deleted_at is null (active ban)
 * - Ban takes effect immediately
 */
export async function test_api_community_ban_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner becomes the creator)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create member account to be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(bannedUserAuth);
  // 4. Owner bans the user from the community
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          reddit_community_member_id: bannedUserAuth.id,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 5. Validate ban record
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals(
    "ban community name matches",
    ban.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned member id matches",
    ban.bannedMember.id,
    bannedUserAuth.id,
  );
  TestValidator.equals(
    "banned by member id matches",
    ban.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.predicate("ban has created_at", ban.created_at !== null);
  TestValidator.predicate("ban has updated_at", ban.updated_at !== null);
  TestValidator.equals(
    "ban is active (deleted_at is null)",
    ban.deleted_at,
    null,
  );
}