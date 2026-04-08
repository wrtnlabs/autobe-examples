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

export async function test_api_member_ban_view_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create banned user (Member A) - capture their auth response for later login
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUserAuth = await authorize_member_join(bannedUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(4) +
        "_banned_" +
        RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedUserAuth);
  // 2. Create moderator (Member B)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(4) +
        "_mod_" +
        RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 3. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_community_" +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Moderator bans Member A from the community
  const banRecord =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: bannedUserAuth.id,
          reason: "Violation of community rules",
        } satisfies IRedditPlatformBannedUser.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(banRecord);
  // 5. Banned user logs in
  const bannedUserLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(bannedUserLoginConnection, {
    body: {
      email: bannedUserAuth.email,
      password: "1234" as unknown as string & tags.Format<"password">,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 6. Banned user views their ban record
  const viewedBan = await api.functional.redditPlatform.member.bans.at(
    bannedUserLoginConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(viewedBan);
  // 7. Validate ban record
  TestValidator.equals(
    "ban record user matches banned user",
    viewedBan.user.username,
    banRecord.user.username,
  );
  TestValidator.equals(
    "community name matches",
    viewedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "banned_by is moderator",
    viewedBan.banned_by.username,
    moderatorAuth.username,
  );
  TestValidator.equals(
    "reason is preserved",
    viewedBan.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "unbanned_at is null (active ban)",
    viewedBan.unbanned_at,
    null,
  );
  TestValidator.equals("ban record id matches", viewedBan.id, banRecord.id);
  TestValidator.equals("user id matches", viewedBan.user.id, banRecord.user.id);
  TestValidator.equals(
    "community id matches",
    viewedBan.community.id,
    banRecord.community.id,
  );
}
