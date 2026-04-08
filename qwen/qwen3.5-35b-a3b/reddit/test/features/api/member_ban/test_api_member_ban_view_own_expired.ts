import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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

export async function test_api_member_ban_view_own_expired(
  connection: api.IConnection,
): Promise<void> {
  // Generate random credentials to reuse
  const bannedUserPassword = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  // 1. Create banned_user (Member A)
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserJoinResult = await authorize_member_join(
    bannedUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: bannedUserPassword,
        username:
          RandomGenerator.alphaNumeric(6) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(bannedUserJoinResult);
  // 2. Create moderator (Member B)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinResult = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: "mod_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorJoinResult);
  // 3. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Moderator bans banned_user from community
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: bannedUserJoinResult.id,
          reason: "Violation of community guidelines - inappropriate content",
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banRecord);
  // 5. Moderator unbans banned_user from community
  await api.functional.redditPlatform.member.communities.bans.erase(
    moderatorConnection,
    {
      communityName: community.name,
      userId: bannedUserJoinResult.id,
    },
  );
  // 6. Banned_user logs in to access their ban record
  const bannedUserLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(bannedUserLoginConnection, {
    body: {
      email: bannedUserJoinResult.email,
      password: bannedUserPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 7. Banned_user views their ban record using the ban ID
  const viewedBanRecord = await api.functional.redditPlatform.member.bans.at(
    bannedUserLoginConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(viewedBanRecord);
  // 8. Validate ban record shows expired status (unbanned_at is not null)
  TestValidator.equals("ban ID matches", viewedBanRecord.id, banRecord.id);
  TestValidator.equals(
    "user ID matches",
    viewedBanRecord.user.id,
    bannedUserJoinResult.id,
  );
  TestValidator.equals(
    "community name matches",
    viewedBanRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "reason matches",
    viewedBanRecord.reason,
    banRecord.reason,
  );
  TestValidator.predicate(
    "unbanned_at is not null (expired status)",
    viewedBanRecord.unbanned_at !== null,
  );
  TestValidator.notEquals(
    "banned_at differs from unbanned_at",
    viewedBanRecord.banned_at,
    viewedBanRecord.unbanned_at,
  );
}
