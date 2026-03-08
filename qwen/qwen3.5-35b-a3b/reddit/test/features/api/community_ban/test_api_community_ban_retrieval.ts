import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_ban_retrieval(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Moderator creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create another member account to be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuth = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(bannedMemberAuth);
  // 4. Moderator bans the other member from the community
  const ban =
    await generate_random_reddit_platform_member_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: bannedMemberAuth.id,
          expires_at: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(ban);
  // 5. Moderator retrieves the ban record by banId
  const retrievedBan = await api.functional.redditPlatform.member.bans.at(
    moderatorConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate ban record details
  TestValidator.equals("ban ID matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "created_at matches",
    retrievedBan.created_at,
    ban.created_at,
  );
  TestValidator.equals(
    "deleted_at is null (active ban)",
    retrievedBan.deleted_at,
    null,
  );
  TestValidator.equals(
    "expires_at is null (permanent ban)",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals("isActive is true", retrievedBan.isActive, true);
  TestValidator.equals("isPermanent is true", retrievedBan.isPermanent, true);
  TestValidator.equals("durationDays is null", retrievedBan.durationDays, null);
  // Validate community summary
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community.id,
    community.id,
  );
  // Validate banned user summary
  TestValidator.equals(
    "banned user ID matches",
    retrievedBan.bannedUser.id,
    bannedMemberAuth.id,
  );
  TestValidator.equals(
    "banned user username matches",
    retrievedBan.bannedUser.username,
    bannedMemberAuth.username,
  );
  TestValidator.equals(
    "banned user displayName matches",
    retrievedBan.bannedUser.displayName,
    bannedMemberAuth.displayName,
  );
  // Validate banning moderator summary
  TestValidator.equals(
    "bannedBy ID matches",
    retrievedBan.bannedBy.id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "bannedBy username matches",
    retrievedBan.bannedBy.username,
    moderatorAuth.username,
  );
  TestValidator.equals(
    "bannedBy displayName matches",
    retrievedBan.bannedBy.displayName,
    moderatorAuth.displayName,
  );
}
