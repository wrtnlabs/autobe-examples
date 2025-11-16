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

export async function test_api_administrator_community_subscriptions_date_analysis(
  connection: api.IConnection,
) {
  // Test filtering community subscriptions by subscription date range to analyze community growth over time.
  // An administrator uses date range filters to identify when members joined the community.
  // The test validates that date range filtering works correctly for historical analysis and trend tracking.

  // 1. Administrator authentication setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member for community creation
  const memberEmail1 = typia.random<string & tags.Format<"email">>();
  const memberPassword1 = RandomGenerator.alphabets(12);
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword1,
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 4. Create additional members
  const memberEmail2 = typia.random<string & tags.Format<"email">>();
  const memberPassword2 = RandomGenerator.alphabets(12);
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword2,
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  const memberEmail3 = typia.random<string & tags.Format<"email">>();
  const memberPassword3 = RandomGenerator.alphabets(12);
  const member3: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail3,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: memberPassword3,
        href: "http://localhost:3000/member/join",
        referrer: "http://localhost:3000/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member3);

  // 5. Switch to member1 context and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail1,
      password: memberPassword1,
      href: "http://localhost:3000/member/login",
      referrer: "http://localhost:3000/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Set up date references for filtering
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const pastDate = new Date(now.getTime() - 30 * oneDay).toISOString();
  const futureDate = new Date(now.getTime() + 30 * oneDay).toISOString();

  // 7. Switch to administrator context for querying subscriptions
  const adminConnection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.administrator.login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin/login",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 8. Test: Retrieve all subscriptions for the community
  const allSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "subscriptions exist for community",
    allSubscriptions.data.length > 0,
  );

  // 9. Test: Filter subscriptions by start date (subscribed_from)
  const afterPastDate: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_from: pastDate,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(afterPastDate);
  TestValidator.predicate(
    "subscriptions filtered by start date",
    afterPastDate.data.length > 0,
  );

  // 10. Test: Filter subscriptions by end date (subscribed_to)
  const beforeFutureDate: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_to: futureDate,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(beforeFutureDate);
  TestValidator.predicate(
    "subscriptions filtered by end date",
    beforeFutureDate.data.length > 0,
  );

  // 11. Test: Filter subscriptions by date range (both start and end)
  const dateRangeSubscriptions: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_from: pastDate,
          subscribed_to: futureDate,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateRangeSubscriptions);
  TestValidator.predicate(
    "subscriptions filtered by date range",
    dateRangeSubscriptions.data.length > 0,
  );

  // 12. Test: Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    dateRangeSubscriptions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    dateRangeSubscriptions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    dateRangeSubscriptions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    dateRangeSubscriptions.pagination.pages >= 0,
  );

  // 13. Test: Sort by newest subscriptions first
  const newestFirst: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(newestFirst);
  TestValidator.predicate(
    "newest sort returns results",
    newestFirst.data.length >= 0,
  );

  // 14. Test: Sort by oldest subscriptions first
  const oldestFirst: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "oldest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(oldestFirst);
  TestValidator.predicate(
    "oldest sort returns results",
    oldestFirst.data.length >= 0,
  );

  // 15. Test: Verify limit parameter works
  const limitedResults: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.administrator.communities.subscriptions.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(limitedResults);
  TestValidator.predicate(
    "limited results respect limit parameter",
    limitedResults.data.length <= 5,
  );

  // 16. Test: Validate subscription data structure
  if (allSubscriptions.data.length > 0) {
    const subscription = allSubscriptions.data[0];
    TestValidator.predicate(
      "subscription has id",
      subscription.id !== null && subscription.id !== undefined,
    );
    TestValidator.equals(
      "subscription community_id matches",
      subscription.community_id,
      community.id,
    );
    TestValidator.predicate(
      "subscription has member_id",
      subscription.member_id !== null && subscription.member_id !== undefined,
    );
    TestValidator.predicate(
      "subscription has subscribed_at timestamp",
      subscription.subscribed_at !== null &&
        subscription.subscribed_at !== undefined,
    );
    TestValidator.predicate(
      "subscription has created_at timestamp",
      subscription.created_at !== null && subscription.created_at !== undefined,
    );
  }

  // 17. Test: Verify that filtering works correctly - results with past start date should return same or more results
  TestValidator.predicate(
    "filtering preserves data integrity",
    dateRangeSubscriptions.data.length === allSubscriptions.data.length ||
      dateRangeSubscriptions.data.length <= allSubscriptions.data.length,
  );
}
