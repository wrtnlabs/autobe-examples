import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityBan";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test ban list pagination mechanics and date range filtering capabilities.
 *
 * Validates the complete ban list query flow including pagination navigation, page size limits, and temporal filtering via created_after and created_before parameters. Ensures that paginated results are consistent across multiple requests with no overlap between pages, and that date range filters correctly include or exclude records based on their creation timestamps.
 *
 * Special attention is given to verifying pagination metadata (current, limit, records, pages) is accurate, that date range filters apply inclusive/exclusive boundaries correctly, and that soft-deleted (lifted) bans are excluded from results by default.
 *
 * 1. Moderator member joins and creates a community.
 * 2. Three additional members join and subscribe to the community.
 * 3. Three ban records are created sequentially with small delays to ensure distinct timestamps.
 * 4. Pagination test: query with page=1, limit=2 and verify metadata and data count.
 * 5. Pagination navigation: query page=2 and verify different records than page 1.
 * 6. Date range filter (created_after): query with first ban's timestamp, verify only later bans returned.
 * 7. Date range filter (created_before): query with second ban's timestamp, verify only earlier bans returned.
 */
export async function test_api_ban_list_pagination_and_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator member joins and creates a community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {},
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(community);
  // 2. Three additional members join and subscribe to the community
  const members: IREdditLikeCommunityMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConn: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConn, { body: {} });
    typia.assert(member);
    members.push(member);
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConn,
      { body: { community_id: community.id } },
    );
  }
  // 3. Three ban records created sequentially
  const bans: IREdditLikeCommunityCommunityBan[] = [];
  const ban1 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: { member_id: members[0].id, reason: "Violation 1" },
      },
    );
  typia.assert(ban1);
  bans.push(ban1);
  await new Promise((r) => setTimeout(r, 100));
  const ban2 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: { member_id: members[1].id, reason: "Violation 2" },
      },
    );
  typia.assert(ban2);
  bans.push(ban2);
  await new Promise((r) => setTimeout(r, 100));
  const ban3 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: { member_id: members[2].id, reason: "Violation 3" },
      },
    );
  typia.assert(ban3);
  bans.push(ban3);
  // 4. Pagination test - page 1, limit 2
  const page1Response = await api.functional.redditLikeCommunity.bans.index(
    moderatorConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 data count at most limit",
    page1Response.data.length,
    2,
  );
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    3,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1Response.pagination.pages,
    Math.ceil(3 / 2),
  );
  TestValidator.predicate("page 1 bans are active", () =>
    page1Response.data.every((b) => b.deleted_at === null),
  );
  // 5. Pagination navigation - page 2
  const page2Response = await api.functional.redditLikeCommunity.bans.index(
    moderatorConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 data count", page2Response.data.length, 1);
  TestValidator.predicate("page 2 bans are active", () =>
    page2Response.data.every((b) => b.deleted_at === null),
  );
  const page1Ids = new Set(page1Response.data.map((b) => b.id));
  const page2Overlap = page2Response.data.filter((b) => page1Ids.has(b.id));
  TestValidator.equals(
    "no overlap between page 1 and page 2",
    page2Overlap.length,
    0,
  );
  // 6. Date range filter - created_after
  const afterTimestamp = ban1.created_at;
  const afterResponse = await api.functional.redditLikeCommunity.bans.index(
    moderatorConnection,
    {
      body: {
        created_after: afterTimestamp,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(afterResponse);
  TestValidator.equals(
    "bans created after first ban timestamp",
    afterResponse.data.length,
    2,
  );
  TestValidator.predicate("all bans have created_at >= filter timestamp", () =>
    afterResponse.data.every(
      (b) =>
        new Date(b.created_at).getTime() >= new Date(afterTimestamp).getTime(),
    ),
  );
  // 7. Date range filter - created_before
  const beforeTimestamp = ban3.created_at;
  const beforeResponse = await api.functional.redditLikeCommunity.bans.index(
    moderatorConnection,
    {
      body: {
        created_before: beforeTimestamp,
      } satisfies IRedditLikeCommunityBan.IRequest,
    },
  );
  typia.assert(beforeResponse);
  TestValidator.equals(
    "bans created before third ban timestamp",
    beforeResponse.data.length,
    2,
  );
  TestValidator.predicate("all bans have created_at < filter timestamp", () =>
    beforeResponse.data.every(
      (b) =>
        new Date(b.created_at).getTime() < new Date(beforeTimestamp).getTime(),
    ),
  );
}
