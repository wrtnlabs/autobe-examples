import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
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
import { generate_random_reddit_platform_member_reddit_platform_communities_users_bans_ban_user } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_communities_users_bans_ban_user";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";

export async function test_api_ban_detail_retrieval_by_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create banned member connection and register
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await api.functional.redditPlatform.auth.member.join(
    bannedMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(bannedMember);
  // 2. Create another member to act as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.member.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(moderator);
  // 3. Create a community using moderator connection
  // Note: This assumes there's a community creation endpoint
  // For now, we'll use a mock community ID since the scenario doesn't specify
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Ban the member from the community
  const banCreateBody = {
    community_id: communityId,
    user_id: bannedMember.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expired_at: null,
  } satisfies IRedditPlatformBan.ICreate;
  const ban =
    await api.functional.redditPlatform.member.redditPlatform.communities.users.bans.banUser(
      moderatorConnection,
      {
        communityId: communityId,
        userId: bannedMember.id,
        body: banCreateBody,
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban details using banned member's connection
  const retrievedBan =
    await api.functional.redditPlatform.member.redditPlatform.bans.at(
      bannedMemberConnection,
      {
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);
  // 6. Validate ban details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals("user matches", retrievedBan.user.id, bannedMember.id);
  TestValidator.equals(
    "community matches",
    retrievedBan.community.id,
    communityId,
  );
  TestValidator.equals(
    "reason matches",
    retrievedBan.reason,
    banCreateBody.reason,
  );
  TestValidator.equals(
    "expiredAt matches",
    retrievedBan.expiredAt,
    banCreateBody.expired_at,
  );
}
