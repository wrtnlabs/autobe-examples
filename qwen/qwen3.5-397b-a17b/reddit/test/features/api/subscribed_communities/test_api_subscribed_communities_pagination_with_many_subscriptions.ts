import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test pagination functionality for subscribed communities when member has many subscriptions.
 *
 * Validates the complete pagination workflow for the subscribed-communities endpoint when a member has subscriptions exceeding the page limit. Tests that results are correctly split across multiple pages with accurate pagination metadata.
 *
 * The test creates 15 communities, subscribes to all of them, then verifies pagination with limit=10 returns correct results on page 1 (10 communities) and page 2 (5 communities). Validates pagination metadata including total records, current page, limit, and total pages.
 *
 * 1. Member registers new account via authorize_member_join.
 * 2. Creates 15 communities using generate_random_reddit_community_member_communities_create.
 * 3. Subscribes to all 15 communities using generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Calls subscribed-communities with limit=10, page=1 and verifies 10 results.
 * 5. Validates pagination metadata (records=15, current=1, limit=10, pages=2).
 * 6. Calls subscribed-communities with limit=10, page=2 and verifies 5 results.
 * 7. Verifies all communities across pages are unique (no duplicates).
 * 8. Verifies total count matches subscriptions created.
 */
export async function test_api_subscribed_communities_pagination_with_many_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create 15 communities
  const communities: IRedditCommunityCommunity[] = await ArrayUtil.asyncRepeat(
    15,
    async () =>
      generate_random_reddit_community_member_communities_create(
        memberConnection,
        {},
      ),
  );
  // 3. Subscribe to all 15 communities
  const subscriptions: IRedditCommunitySubscription[] =
    await ArrayUtil.asyncRepeat(15, async (index) =>
      generate_random_reddit_community_member_member_subscriptions_create(
        memberConnection,
        {
          body: {
            community_id: communities[index].id,
          } satisfies IRedditCommunitySubscription.ICreate,
        },
      ),
    );
  // 4. Call subscribed-communities with limit=10, page=1
  const page1 =
    await api.functional.redditCommunity.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(page1);
  // 5. Verify first page returns exactly 10 communities
  TestValidator.equals("page 1 community count", page1.data.length, 10);
  // 6. Verify pagination metadata for page 1
  TestValidator.equals("page 1 total records", page1.pagination.records, 15);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 2);
  // 7. Call subscribed-communities with page=2
  const page2 =
    await api.functional.redditCommunity.member.subscribed_communities.index(
      memberConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(page2);
  // 8. Verify second page returns remaining 5 communities
  TestValidator.equals("page 2 community count", page2.data.length, 5);
  // Verify pagination metadata for page 2
  TestValidator.equals("page 2 total records", page2.pagination.records, 15);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 2);
  // 9. Verify all communities across both pages are unique (no duplicates)
  const allCommunityIds = [
    ...page1.data.map((c) => c.id),
    ...page2.data.map((c) => c.id),
  ];
  const uniqueCommunityIds = new Set(allCommunityIds);
  TestValidator.equals(
    "all communities are unique",
    uniqueCommunityIds.size,
    allCommunityIds.length,
  );
  // 10. Verify total count matches subscriptions created
  TestValidator.equals(
    "total subscribed communities",
    page1.data.length + page2.data.length,
    subscriptions.length,
  );
}
