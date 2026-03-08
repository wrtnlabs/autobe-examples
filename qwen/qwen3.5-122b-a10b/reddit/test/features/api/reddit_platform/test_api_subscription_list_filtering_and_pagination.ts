import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_subscription_list_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple communities with different names
  const communityNames = [
    "Technology News",
    "Science Daily",
    "Health & Wellness",
    "Tech Gadgets",
    "Medical Research",
    "Fitness Tips",
    "Programming Hub",
    "Wellness Journey",
    "Gadget Reviews",
    "Science Fiction",
  ];
  const communities = await ArrayUtil.asyncRepeat(
    communityNames.length,
    async (index) => {
      const community =
        await generate_random_reddit_platform_member_communities_create(
          memberConnection,
          {
            body: {
              name: communityNames[index],
              description: `Community for ${communityNames[index].toLowerCase()} discussion`,
            } satisfies IRedditPlatformCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    },
  );
  // 3. Subscribe to communities at different times
  const subscriptionDates: Date[] = [];
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  // Create subscriptions over a 10-day period
  for (let i = 0; i < communities.length; i++) {
    // Simulate different subscription dates
    const subscriptionDate = new Date(now.getTime() - (9 - i) * oneDay);
    subscriptionDates.push(subscriptionDate);
    // Subscribe to community
    const subscription =
      await api.functional.redditPlatform.member.communities.subscriptions.create(
        memberConnection,
        {
          communityId: communities[i].id,
        },
      );
    typia.assert(subscription);
  }
  // 4. Test name filtering (partial match)
  const techSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "tech",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(techSubscriptions);
  // Verify all results contain "tech" in name
  TestValidator.predicate(
    "all filtered results contain 'tech'",
    techSubscriptions.data.every((sub) =>
      sub.community.name.toLowerCase().includes("tech"),
    ),
  );
  // 5. Test date range filtering
  const startDate = new Date(now.getTime() - 6 * oneDay);
  const endDate = new Date(now.getTime() - 3 * oneDay);
  const dateFiltered =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          created_at_from: startDate.toISOString(),
          created_at_to: endDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Verify all results are within date range
  await TestValidator.predicate("all results within date range", async () => {
    for (const sub of dateFiltered.data) {
      const subDate = new Date(sub.created_at);
      if (subDate < startDate || subDate > endDate) {
        return false;
      }
    }
    return true;
  });
  // 6. Test sorting by name (ASC)
  const nameSorted =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "name:ASC",
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(nameSorted);
  // Verify alphabetical ordering
  TestValidator.predicate(
    "results sorted alphabetically by name",
    nameSorted.data.every((sub, index) => {
      if (index === 0) return true;
      return sub.community.name >= nameSorted.data[index - 1].community.name;
    }),
  );
  // 7. Test pagination
  const page1 = await api.functional.redditPlatform.member.subscriptions.index(
    memberConnection,
    {
      body: {
        limit: 3,
        page: 1,
      } satisfies IRedditPlatformCommunitySubscription.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.redditPlatform.member.subscriptions.index(
    memberConnection,
    {
      body: {
        limit: 3,
        page: 2,
      } satisfies IRedditPlatformCommunitySubscription.IRequest,
    },
  );
  typia.assert(page2);
  // Verify pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 3);
  TestValidator.equals("page 1 data count", page1.data.length, 3);
  TestValidator.equals("page 2 data count", page2.data.length, 3);
  // Verify no overlap between pages
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  TestValidator.predicate(
    "no overlap between pages",
    Array.from(page1Ids).every((id) => !page2Ids.has(id)),
  );
  // 8. Test combined filtering and pagination
  const combinedFilter =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "tech",
          sort: "name:ASC",
          limit: 2,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify filtered and sorted results
  TestValidator.predicate(
    "combined filter results contain 'tech'",
    combinedFilter.data.every((sub) =>
      sub.community.name.toLowerCase().includes("tech"),
    ),
  );
  // Verify total count is accurate
  const allSubscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.equals(
    "total records match data length",
    allSubscriptions.pagination.records,
    allSubscriptions.data.length,
  );
  // 9. Verify pagination metadata reflects filtered results
  const filteredPage1 =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "tech",
          limit: 2,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredPage1);
  const filteredPage2 =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          search: "tech",
          limit: 2,
          page: 2,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredPage2);
  TestValidator.equals(
    "filtered pagination records count",
    filteredPage1.pagination.records,
    filteredPage2.pagination.records,
  );
  // 10. Test consistent ordering across pages
  const orderPage1 =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "name:ASC",
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(orderPage1);
  const orderPage2 =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          sort: "name:ASC",
          limit: 5,
          page: 2,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(orderPage2);
  // Verify page 2 starts after page 1 ends
  if (orderPage1.data.length > 0 && orderPage2.data.length > 0) {
    TestValidator.predicate(
      "consistent ordering across pages",
      orderPage2.data[0].community.name >=
        orderPage1.data[orderPage1.data.length - 1].community.name,
    );
  }
}