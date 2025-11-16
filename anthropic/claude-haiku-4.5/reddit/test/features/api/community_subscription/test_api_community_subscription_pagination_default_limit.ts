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

export async function test_api_community_subscription_pagination_default_limit(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const categoryData = {
    name: "Technology",
    slug: `tech_${RandomGenerator.alphabets(8)}`,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphabets(8)}`,
        password: "MemberPassword123!",
        href: "https://example.com",
        referrer: "https://example.com/join",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community (creator is auto-subscribed)
  const communityData = {
    name: RandomGenerator.name(2),
    identifier: `comm_${RandomGenerator.alphabets(12)}`,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "creator should be auto-subscribed",
    community.subscriber_count,
    1,
  );

  // Step 5: Query subscriptions with page=1 and no explicit limit parameter
  const subscriptionPage: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          // No limit specified - should use default of 20
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionPage);

  // Step 6: Verify pagination metadata exists
  TestValidator.predicate(
    "response should contain pagination metadata",
    subscriptionPage.pagination !== undefined &&
      subscriptionPage.pagination !== null,
  );

  // Step 7: Verify default limit of 20 is applied
  TestValidator.equals(
    "default limit should be 20 items per page",
    subscriptionPage.pagination.limit,
    20,
  );

  // Step 8: Verify current page is 1
  TestValidator.equals(
    "current page should be 1",
    subscriptionPage.pagination.current,
    1,
  );

  // Step 9: Verify total pages calculation
  // Pages = ceil(total_records / limit)
  const expectedPages = Math.ceil(
    subscriptionPage.pagination.records / subscriptionPage.pagination.limit,
  );
  TestValidator.equals(
    "total pages should match calculated ceil(records/limit)",
    subscriptionPage.pagination.pages,
    expectedPages,
  );

  // Step 10: Verify data array length matches limit or total records (whichever is smaller)
  const expectedDataLength = Math.min(
    subscriptionPage.pagination.limit,
    subscriptionPage.pagination.records,
  );
  TestValidator.equals(
    "returned items should match expected page size",
    subscriptionPage.data.length,
    expectedDataLength,
  );

  // Step 11: Verify each subscription record has required fields and valid structure
  for (const subscription of subscriptionPage.data) {
    typia.assert(subscription);

    TestValidator.predicate(
      "each subscription should have valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subscription.id,
      ),
    );

    TestValidator.equals(
      "subscription should reference correct community",
      subscription.community_id,
      community.id,
    );

    TestValidator.predicate(
      "subscription should have valid member_id UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        subscription.member_id,
      ),
    );

    TestValidator.predicate(
      "subscription should have subscribed_at timestamp",
      subscription.subscribed_at !== "" &&
        !isNaN(Date.parse(subscription.subscribed_at)),
    );

    TestValidator.predicate(
      "subscription should have created_at timestamp",
      subscription.created_at !== "" &&
        !isNaN(Date.parse(subscription.created_at)),
    );
  }
}
