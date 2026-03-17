import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { prepare_random_reddit_clone_ban } from "../../../prepare/prepare_random_reddit_clone_ban";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test community ban creation by moderator.
 *
 * This test verifies the complete ban creation workflow:
 * 1. Create and authenticate a member who will own the community
 * 2. Create a community (owner becomes moderator automatically)
 * 3. Create a second member account to be banned
 * 4. Issue a ban against the second member with a valid reason
 *
 * Validates: Ban record created with correct member_id, community_id,
 * issuer_id, and reason. Ban is active (deleted_at is null).
 * Issuer information matches the community owner.
 */
export async function test_api_community_ban_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community (owner becomes moderator automatically)
  const community = await generate_random_reddit_clone_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create second member account to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Create ban against the second member
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await api.functional.redditClone.member.communities.bans.create(
    ownerConnection,
    {
      communityId: community.id,
      body: {
        member_id: bannedMemberAuth.id,
        reason: banReason,
      } satisfies IRedditCloneBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate ban record
  TestValidator.equals("banned member id", ban.member.id, bannedMemberAuth.id);
  TestValidator.equals("community id", ban.community.id, community.id);
  TestValidator.equals("issuer id", ban.issuer.id, ownerAuth.id);
  TestValidator.equals("ban reason", ban.reason, banReason);
  TestValidator.predicate("ban is active", ban.deleted_at === null);
  TestValidator.predicate("ban has valid id", ban.id !== null);
  TestValidator.predicate("ban has created_at", ban.created_at !== null);
  TestValidator.predicate("ban has updated_at", ban.updated_at !== null);
}
