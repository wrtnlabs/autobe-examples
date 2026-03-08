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
import { generate_random_reddit_platform_member_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_add";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_moderator_ban_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(owner);
  // 2. Create member to be banned
  const bannedUserConnection: api.IConnection = { host: connection.host };
  const bannedUser: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(bannedUserConnection, {
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(bannedUser);
  // 3. Owner creates community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(adminConnection, {
    body: {
      email: owner.email,
      password: owner.token.access,
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Owner bans the user (as community owner) - permanent ban
  const banConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(banConnection, {
    body: {
      email: owner.email,
      password: owner.token.access,
    },
  });
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      banConnection,
      {
        communityId: community.id,
        body: {
          user_id: bannedUser.id,
          expires_at: null, // permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Verify ban record fields
  TestValidator.equals("ban is active", banRecord.isActive, true);
  TestValidator.equals("ban is permanent", banRecord.isPermanent, true);
  TestValidator.equals(
    "duration days is null for permanent ban",
    banRecord.durationDays,
    null,
  );
  TestValidator.equals(
    "banned user matches",
    banRecord.bannedUser.id,
    bannedUser.id,
  );
  TestValidator.equals("banned by owner", banRecord.bannedBy.id, owner.id);
  TestValidator.equals(
    "community matches",
    banRecord.community.id,
    community.id,
  );
  // 6. Verify ban has expected timestamps
  typia.assertGuard(banRecord.created_at!);
  typia.assertGuard(banRecord.updated_at!);
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(banRecord.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(banRecord.updated_at)),
  );
  // 7. Verify deleted_at is null (active ban)
  TestValidator.equals(
    "deleted_at is null for active ban",
    banRecord.deleted_at,
    null,
  );
}
