import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBannedUser";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
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

export async function test_api_community_ban_temporary_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community as the owner using ownerConnection (headers already set by authorize_member_join)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.Pattern<"^[a-zA-Z0-9_]+$"> &
              tags.MinLength<3> &
              tags.MaxLength<50>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register target user account
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetAuth);
  // 4. Subscribe target user to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      ownerConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create temporary ban with expiration date (24 hours in the future)
  const banExpirationDate = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          user_id: targetAuth.id,
          reason: "Temporary suspension for policy violation",
          expiration_date: banExpirationDate,
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Validate ban creation
  TestValidator.equals(
    "ban reason",
    ban.reason,
    "Temporary suspension for policy violation",
  );
  TestValidator.equals(
    "ban user_id matches target",
    ban.user.id,
    targetAuth.id,
  );
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals(
    "ban bannedBy matches owner",
    ban.bannedBy.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "ban unbanned_at is null for active ban",
    ban.unbanned_at,
    null,
  );
  // 7. Validate expiration_date is set and in the future
  TestValidator.equals(
    "expiration_date should be set",
    ban.unbanned_at,
    banExpirationDate,
  );
  TestValidator.predicate(
    "expiration_date is in future",
    new Date(ban.unbanned_at!).getTime() > Date.now(),
  );
  // 8. Validate timestamps
  const banBannedAt = new Date(ban.banned_at);
  const banCreatedAt = new Date(ban.created_at);
  TestValidator.predicate(
    "banned_at is recent",
    banBannedAt.getTime() > Date.now() - 1000,
  );
  TestValidator.predicate(
    "created_at is recent",
    banCreatedAt.getTime() > Date.now() - 1000,
  );
}
