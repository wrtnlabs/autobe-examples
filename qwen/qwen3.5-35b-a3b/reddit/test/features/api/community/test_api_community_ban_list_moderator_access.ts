import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
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

export async function test_api_community_ban_list_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Authorized = await authorize_member_join(member1Connection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1Authorized);
  // 2. Create community as owner (member1)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Authenticate as member2 (user to be banned)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Authorized = await authorize_member_join(member2Connection, {
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
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Authorized);
  // 4. Ban member2 from community (as owner - member1)
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      member1Connection,
      {
        communityId: community.id,
        body: {
          user_id: member2Authorized.id,
          expires_at: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Retrieve ban list (as owner - member1)
  const banList = await api.functional.redditPlatform.communities.bans.index(
    member1Connection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(banList);
  // 6. Validate ban list response
  TestValidator.equals("ban list has one ban", banList.data.length, 1);
  const banRecord = banList.data[0];
  typia.assert(banRecord);
  TestValidator.equals(
    "banned user username matches",
    banRecord.user.username,
    member2Authorized.username,
  );
  TestValidator.equals(
    "banned user displayName matches",
    banRecord.user.displayName,
    member2Authorized.displayName,
  );
  TestValidator.equals(
    "banned user id matches",
    banRecord.user.id,
    member2Authorized.id,
  );
  TestValidator.equals(
    "community id matches",
    banRecord.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    banRecord.community.name,
    community.name,
  );
  TestValidator.equals(
    "bannedBy username matches",
    banRecord.bannedBy.username,
    member1Authorized.username,
  );
  TestValidator.equals(
    "bannedBy id matches",
    banRecord.bannedBy.id,
    member1Authorized.id,
  );
  TestValidator.predicate(
    "createdAt is valid datetime",
    () => !isNaN(Date.parse(banRecord.createdAt)),
  );
  TestValidator.equals(
    "expiresAt is null for permanent ban",
    banRecord.expiresAt,
    null,
  );
  TestValidator.equals(
    "deletedAt is null for active ban",
    banRecord.deletedAt,
    null,
  );
  TestValidator.equals(
    "isActive is true for active ban",
    banRecord.isActive,
    true,
  );
  // 7. Validate pagination
  TestValidator.equals(
    "pagination current page is 1",
    banList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", banList.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count is 1",
    banList.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages count is 1",
    banList.pagination.pages,
    1,
  );
  // 8. Verify banned user cannot access ban list
  await TestValidator.error("banned user cannot access ban list", async () => {
    await api.functional.redditPlatform.communities.bans.index(
      member2Connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  });
}
