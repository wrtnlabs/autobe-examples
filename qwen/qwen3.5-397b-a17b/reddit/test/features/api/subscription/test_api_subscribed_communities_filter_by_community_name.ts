import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_subscribed_communities_filter_by_community_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create communities with different names for filtering test
  // Community 1: "TestGaming" - will match search term "gaming"
  const community1 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "TestGaming",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(community1);
  // Community 2: "TechGaming" - will also match search term "gaming"
  const community2 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "TechGaming",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(community2);
  // Community 3: "FoodRecipes" - will NOT match search term "gaming"
  const community3 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "FoodRecipes",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(community3);
  // Community 4: "GamingNews" - will match search term "gaming"
  const community4 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: "GamingNews",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon: null,
      },
    },
  );
  typia.assert(community4);
  // 3. Subscribe member to all communities
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
        },
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community3.id,
        },
      },
    );
  typia.assert(subscription3);
  const subscription4 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community4.id,
        },
      },
    );
  typia.assert(subscription4);
  // 4. Test filtering by community name "gaming" (case-insensitive partial match)
  const filteredResult =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        community_name: "gaming",
        sort: "community_name_asc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(filteredResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "filtered records count should be 3 (TestGaming, TechGaming, GamingNews)",
    () => filteredResult.pagination.records === 3,
  );
  TestValidator.predicate(
    "filtered data length should match records count",
    () => filteredResult.data.length === filteredResult.pagination.records,
  );
  // Validate all returned communities contain "gaming" in their name (case-insensitive)
  for (const community of filteredResult.data) {
    TestValidator.predicate(
      `community "${community.name}" should contain "gaming"`,
      () => community.name.toLowerCase().includes("gaming"),
    );
  }
  // Validate that FoodRecipes is NOT in the filtered results
  const hasFoodRecipes = filteredResult.data.some(
    (c) => c.name === "FoodRecipes",
  );
  TestValidator.predicate(
    "FoodRecipes should not be in gaming-filtered results",
    () => !hasFoodRecipes,
  );
  // Validate community_name_asc sort order (alphabetical)
  for (let i = 1; i < filteredResult.data.length; i++) {
    TestValidator.predicate(
      `community_name_asc order at index ${i}`,
      () =>
        filteredResult.data[i - 1].name.localeCompare(
          filteredResult.data[i].name,
        ) <= 0,
    );
  }
  // 5. Test sorting with filtering - created_at_desc
  const sortedDescResult =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        community_name: "gaming",
        sort: "created_at_desc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(sortedDescResult);
  TestValidator.predicate(
    "sorted desc records count should be 3",
    () => sortedDescResult.pagination.records === 3,
  );
  // Validate created_at_desc order (newest first)
  for (let i = 1; i < sortedDescResult.data.length; i++) {
    const prevDate = new Date(
      sortedDescResult.data[i - 1].created_at,
    ).getTime();
    const currDate = new Date(sortedDescResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at_desc order at index ${i}`,
      () => prevDate >= currDate,
    );
  }
  // 6. Test sorting with filtering - created_at_asc
  const sortedAscResult =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        community_name: "gaming",
        sort: "created_at_asc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(sortedAscResult);
  TestValidator.predicate(
    "sorted asc records count should be 3",
    () => sortedAscResult.pagination.records === 3,
  );
  // Validate created_at_asc order (oldest first)
  for (let i = 1; i < sortedAscResult.data.length; i++) {
    const prevDate = new Date(sortedAscResult.data[i - 1].created_at).getTime();
    const currDate = new Date(sortedAscResult.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at_asc order at index ${i}`,
      () => prevDate <= currDate,
    );
  }
  // 7. Test filtering with different search term "food"
  const foodFilteredResult =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        community_name: "food",
        sort: "community_name_asc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(foodFilteredResult);
  TestValidator.predicate(
    "food-filtered records count should be 1 (FoodRecipes)",
    () => foodFilteredResult.pagination.records === 1,
  );
  TestValidator.predicate(
    "food-filtered should contain FoodRecipes",
    () =>
      foodFilteredResult.data.length === 1 &&
      foodFilteredResult.data[0].name === "FoodRecipes",
  );
  // 8. Test no filter (retrieve all subscriptions)
  const allSubscriptionsResult =
    await api.functional.redditClone.member.subscribed.index(memberConnection, {
      body: {
        sort: "community_name_asc",
      } satisfies IRedditCloneSubscription.IRequest,
    });
  typia.assert(allSubscriptionsResult);
  TestValidator.predicate(
    "all subscriptions records count should be 4",
    () => allSubscriptionsResult.pagination.records === 4,
  );
  TestValidator.predicate(
    "all subscriptions data length should be 4",
    () => allSubscriptionsResult.data.length === 4,
  );
}
