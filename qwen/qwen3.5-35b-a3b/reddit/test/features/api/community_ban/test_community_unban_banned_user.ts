import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_community_unban_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  // Create owner-specific connection with token
  const ownerConnection: api.IConnection = { host: connection.host };
  if (ownerAuth.token.access) {
    ownerConnection.headers = {
      ...connection.headers,
      Authorization: ownerAuth.token.access,
    };
  }
  // Step 2: Owner creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create second member to be banned
  const secondAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: RandomGenerator.paragraph({ sentences: 1 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondAuth);
  // Create second user-specific connection with token
  const secondConnection: api.IConnection = { host: connection.host };
  if (secondAuth.token.access) {
    secondConnection.headers = {
      ...connection.headers,
      Authorization: secondAuth.token.access,
    };
  }
  // Step 4: Owner bans the second user
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          userId: secondAuth.user.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validate ban is initially active (deletedAt should be null)
  TestValidator.equals("ban initially active", ban.deletedAt, null);
  TestValidator.equals("ban ID exists", ban.id !== undefined, true);
  // Step 5: Owner performs unban operation
  const unban =
    await api.functional.redditPlatform.member.communities.bans.putByCommunityidAndBanid(
      ownerConnection,
      {
        communityId: community.id,
        banId: ban.id,
        body: {
          unbanReason:
            "Successfully restored user privileges after temporary ban period",
        } satisfies IRedditPlatformCommunityBan.IUnban,
      },
    );
  typia.assert(unban);
  // Step 6: Validate unban response
  // deletedAt should be set to current timestamp (not null)
  TestValidator.predicate(
    "unban deletedAt is set",
    () => unban.deletedAt !== null,
  );
  // Verify ban record ID is preserved (same record updated)
  TestValidator.equals("ban ID preserved after unban", unban.id, ban.id);
  // Verify community ID matches
  TestValidator.equals(
    "unban community ID matches",
    unban.community.id,
    community.id,
  );
  // Verify banned user ID matches
  TestValidator.equals(
    "unban author ID matches",
    unban.author.id,
    secondAuth.user.id,
  );
  // Verify updatedAt was updated after unban
  TestValidator.notEquals(
    "unban updatedAt changed",
    ban.updatedAt,
    unban.updatedAt,
  );
}