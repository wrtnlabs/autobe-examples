import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
import { prepare_random_reddit_platform_banned_user } from "../../../prepare/prepare_random_reddit_platform_banned_user";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_ban_list_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member 1 (community owner/moderator)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() || undefined,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community as owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: "Test community for ban list inactive validation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate member 2 (user who will be banned then unbanned)
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() || undefined,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // 4. Create a ban record on member 2 (active ban)
  const activeBan =
    await generate_random_reddit_platform_member_communities_bans_create(
      ownerConnection,
      {
        body: {
          user_id: bannedUserAuth.id,
          reason: "Test ban for inactive ban list validation",
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: { communityName: community.name },
      },
    );
  typia.assert(activeBan);
  // 5. Lift the ban by deleting it (sets unbanned_at)
  await api.functional.redditPlatform.member.communities.bans.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: bannedUserAuth.id,
    },
  );
  // 6. Authenticate member 3 (non-moderator)
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() || undefined,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(nonModeratorAuth);
  // 7. List inactive bans as moderator (should succeed and return the lifted ban)
  const inactiveBans =
    await api.functional.redditPlatform.member.communities.bans.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          status: "inactive",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(inactiveBans);
  // 8. Test that non-moderator gets 403 Forbidden
  await TestValidator.error(
    "non-moderator cannot access ban list",
    async () => {
      await api.functional.redditPlatform.member.communities.bans.index(
        nonModeratorConnection,
        {
          communityName: community.name,
          body: {
            status: "inactive",
            page: 1,
            limit: 20,
          } satisfies IRedditPlatformCommunityBan.IRequest,
        },
      );
    },
  );
  // Validation: inactive ban record exists with unbanned_at populated
  TestValidator.equals(
    "inactive bans count",
    inactiveBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "inactive bans data length",
    inactiveBans.data.length,
    1,
  );
  const retrievedBan = inactiveBans.data[0];
  typia.assert(retrievedBan);
  // Validate unbanned_at is NOT NULL (inactive ban)
  TestValidator.predicate(
    "unbanned_at is not null for inactive ban",
    retrievedBan.unbanned_at !== null,
  );
  // Validate the ban reason is preserved
  TestValidator.equals(
    "ban reason preserved",
    retrievedBan.reason,
    activeBan.reason,
  );
  // Validate user_id matches
  TestValidator.equals(
    "banned user matches",
    retrievedBan.user.id,
    bannedUserAuth.id,
  );
  // Validate banned_at is preserved
  TestValidator.equals(
    "banned_at preserved",
    retrievedBan.banned_at,
    activeBan.banned_at,
  );
  // Validate unbanned_at is a valid ISO datetime string
  TestValidator.predicate(
    "unbanned_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedBan.unbanned_at!),
  );
}