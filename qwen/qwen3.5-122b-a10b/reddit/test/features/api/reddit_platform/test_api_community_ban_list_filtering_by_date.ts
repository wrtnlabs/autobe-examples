import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_ban_list_filtering_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.member.join(
    moderatorConnection,
    {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    },
  );
  typia.assert(moderator);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create target member to be banned
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await api.functional.redditPlatform.auth.member.join(
    targetConnection,
    {
      body: typia.assert<IRedditPlatformMember.IJoin>({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      }),
    },
  );
  typia.assert(targetMember);
  // 4. Create ban records at different times
  const ban1 =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reddit_platform_member_id: targetMember.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const ban2 =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reddit_platform_member_id: targetMember.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // Wait again for distinct timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));
  const ban3 =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          reddit_platform_member_id: targetMember.id,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban3);
  // 5. Filter bans by date range (created_at_from and created_at_to)
  const startDate = new Date(ban1.created_at);
  const endDate = new Date(ban3.created_at);
  // Extend range slightly to include boundary dates
  startDate.setMinutes(startDate.getMinutes() - 1);
  endDate.setMinutes(endDate.getMinutes() + 1);
  const filteredBans: IPageIRedditPlatformCommunityBan.ISummary =
    await api.functional.redditPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          created_at_from: startDate.toISOString(),
          created_at_to: endDate.toISOString(),
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(filteredBans);
  // 6. Validate that all bans within range are returned
  TestValidator.equals(
    "filtered ban count matches total bans",
    filteredBans.data.length,
    3,
  );
  // 7. Filter by narrower date range (only ban2)
  const ban2Date = new Date(ban2.created_at);
  const narrowStart = new Date(ban2Date.getTime() - 500);
  const narrowEnd = new Date(ban2Date.getTime() + 500);
  const narrowFiltered: IPageIRedditPlatformCommunityBan.ISummary =
    await api.functional.redditPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          created_at_from: narrowStart.toISOString(),
          created_at_to: narrowEnd.toISOString(),
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(narrowFiltered);
  // 8. Validate that only ban2 is returned in narrow range
  TestValidator.equals(
    "narrow date range returns only matching ban",
    narrowFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "narrow range ban ID matches ban2",
    narrowFiltered.data[0].id,
    ban2.id,
  );
  // 9. Test with date range before all bans (should return empty)
  const beforeStart = new Date(ban1.created_at);
  beforeStart.setHours(beforeStart.getHours() - 1);
  const beforeEnd = new Date(ban1.created_at);
  beforeEnd.setHours(beforeEnd.getHours() - 30);
  const beforeFiltered: IPageIRedditPlatformCommunityBan.ISummary =
    await api.functional.redditPlatform.member.communities.bans.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          created_at_from: beforeEnd.toISOString(),
          created_at_to: beforeStart.toISOString(),
        } satisfies IRedditPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(beforeFiltered);
  TestValidator.equals(
    "date range before all bans returns empty",
    beforeFiltered.data.length,
    0,
  );
  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    filteredBans.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count matches data length",
    filteredBans.pagination.records,
    filteredBans.data.length,
  );
}