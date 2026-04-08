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

export async function test_api_community_ban_owner_bans_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ownerPass123",
      username: RandomGenerator.alphaNumeric(8) + "_owner",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create community as owner
  const communityName = RandomGenerator.alphaNumeric(6) + "_community";
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: "Test community for ban functionality testing",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner matches",
    community.owner.id,
    ownerAuth.id,
  );
  // 3. Register target user
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "targetPass123",
      username: RandomGenerator.alphaNumeric(8) + "_target",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetAuth);
  // 4. Subscribe target user to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      targetConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
  // 5. Owner bans target user
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityName: communityName,
        body: {
          user_id: targetAuth.id,
          reason: "Spam posting in community discussions",
          expiration_date: null,
        } satisfies IRedditPlatformBannedUser.ICreate,
      },
    );
  typia.assert(ban);
  // 6. Validate ban record
  TestValidator.equals("ban user matches target", ban.user.id, targetAuth.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("ban created by owner", ban.bannedBy.id, ownerAuth.id);
  TestValidator.equals(
    "ban reason stored",
    ban.reason,
    "Spam posting in community discussions",
  );
  TestValidator.equals("ban is permanent", ban.unbanned_at, null);
  TestValidator.notEquals("ban has banned_at", ban.banned_at, null);
  TestValidator.notEquals("ban has created_at", ban.created_at, null);
  TestValidator.notEquals("ban has updated_at", ban.updated_at, null);
}
