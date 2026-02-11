import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_reddit_platform_communities_users_bans_ban_user } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_communities_users_bans_ban_user";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_member_ban_temporary_vs_permanent(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for different actors
  const moderatorConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register moderator user
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Register member user to be banned
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 3. Create community as moderator
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe member to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 5. Test temporary ban
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 24); // 24 hours from now
  const temporaryBan =
    await api.functional.redditPlatform.member.redditPlatform.communities.users.bans.banUser(
      moderatorConnection,
      {
        communityId: community.id,
        userId: member.id,
        body: {
          community_id: community.id,
          user_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expired_at: futureDate.toISOString(),
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  // Validate temporary ban has expiration
  TestValidator.equals(
    "temporary ban has expiration timestamp",
    temporaryBan.expiredAt !== null,
    true,
  );
  TestValidator.predicate(
    "expiration is in future",
    () => new Date(temporaryBan.expiredAt!).getTime() > Date.now(),
  );
  // 6. Test permanent ban
  const permanentBan =
    await api.functional.redditPlatform.member.redditPlatform.communities.users.bans.banUser(
      moderatorConnection,
      {
        communityId: community.id,
        userId: member.id,
        body: {
          community_id: community.id,
          user_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expired_at: null, // permanent ban
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(permanentBan);
  // Validate permanent ban has null expiration
  TestValidator.equals(
    "permanent ban has null expiration",
    permanentBan.expiredAt,
    null,
  );
}