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

export async function test_api_member_ban_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<'email'>>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create community and get its owner
  const community =
    await api.functional.redditPlatform.member.communities.create(connection, {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformCommunity.ICreate,
    });
  typia.assert(community);
  // 3. Subscribe member to community
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.member.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<'email'>>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(moderator);
  // 5. Create second moderator user (owner of community) to grant permissions
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await api.functional.redditPlatform.auth.member.join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<'email'>>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(owner);
  // 6. Create another community owned by the owner user
  const ownerCommunity =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(ownerCommunity);
  // 7. Ban the member user as owner of the community
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const ban =
    await api.functional.redditPlatform.member.redditPlatform.communities.users.bans.banUser(
      ownerConnection,
      {
        communityId: ownerCommunity.id,
        userId: member.id,
        body: {
          reason: banReason,
          expired_at: null,
          community_id: ownerCommunity.id,
          user_id: member.id,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(ban);
  // 8. Validate ban record
  TestValidator.equals(
    'community matches',
    ban.community.id,
    ownerCommunity.id,
  );
  TestValidator.equals('user matches', ban.user.id, member.id);
  TestValidator.equals('moderator matches', ban.bannedBy.id, owner.id);
  TestValidator.equals('reason matches', ban.reason, banReason);
  TestValidator.equals('expiration is null', ban.expiredAt, null);
}