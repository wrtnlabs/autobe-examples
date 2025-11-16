import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

export async function test_api_administrator_community_subscriptions_filter_by_member_activity(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.predicate(
    "admin should be authorized",
    admin.token.access.length > 0,
  );

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community as a member (who becomes the creator)
  const memberConnection: api.IConnection = { ...connection, headers: {} };

  const communityCreator = await api.functional.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: `creator_${RandomGenerator.alphabets(6)}`,
        password: "SecurePass123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(communityCreator);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: List all subscriptions for the community (creator is auto-subscribed)
  const allSubscriptionsResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptionsResult);
  TestValidator.equals(
    "initial subscriptions should include creator",
    allSubscriptionsResult.pagination.records,
    1,
  );

  // Step 5: Test pagination with smaller page size
  const paginatedResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );

  // Step 6: Test sorting by newest subscriptions
  const newestResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          sort_by: "newest",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(newestResult);
  TestValidator.predicate(
    "newest sort should return valid data",
    Array.isArray(newestResult.data),
  );

  // Step 7: Test sorting by oldest subscriptions
  const oldestResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          sort_by: "oldest",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(oldestResult);
  TestValidator.predicate(
    "oldest sort should return valid data",
    Array.isArray(oldestResult.data),
  );

  // Step 8: Test filtering by subscription date range
  const dateFilterResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          subscribed_from: new Date(Date.now() - 86400000).toISOString(),
          subscribed_to: new Date(Date.now() + 86400000).toISOString(),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date range filter should return valid results",
    dateFilterResult.pagination.records >= 1,
  );

  // Step 9: Test karma-based filtering
  const karmaFilterResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          min_karma: 0,
          max_karma: 10000,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(karmaFilterResult);
  TestValidator.predicate(
    "karma filter should return valid results",
    karmaFilterResult.pagination !== undefined,
  );

  // Step 10: Verify subscription data structure contains all expected fields
  TestValidator.predicate(
    "subscriptions list should not be empty",
    newestResult.data.length > 0,
  );

  if (newestResult.data.length > 0) {
    const subscription = newestResult.data[0];
    TestValidator.predicate(
      "subscription should have id field",
      subscription.id !== undefined && subscription.id.length > 0,
    );
    TestValidator.equals(
      "subscription community_id should match queried community",
      subscription.community_id,
      community.id,
    );
    TestValidator.predicate(
      "subscription should have member_id",
      subscription.member_id !== undefined && subscription.member_id.length > 0,
    );
    TestValidator.predicate(
      "subscription should have subscribed_at timestamp",
      subscription.subscribed_at !== undefined,
    );
    TestValidator.predicate(
      "subscription should have created_at timestamp",
      subscription.created_at !== undefined,
    );
  }

  // Step 11: Test search by username (filtering subscriptions by member username)
  const searchByUsernameResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          search_username: "creator",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchByUsernameResult);
  TestValidator.predicate(
    "username search should return paginated results",
    searchByUsernameResult.pagination !== undefined,
  );

  // Step 12: Test pagination across pages when limit is set
  const pageCheckResult =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(pageCheckResult);
  TestValidator.predicate(
    "total records should be calculable",
    pageCheckResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be available",
    pageCheckResult.pagination.pages > 0,
  );
}
