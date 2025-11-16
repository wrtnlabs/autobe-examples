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

/**
 * Test subscription list pagination with custom page limit.
 *
 * Validates that community subscription pagination respects custom limit values
 * and returns correct pagination metadata. The test creates a community with
 * 50+ members and tests pagination with custom page size of 10.
 *
 * **Steps:**
 *
 * 1. Create and authenticate administrator
 * 2. Create category for community classification
 * 3. Create member and authenticate as community creator
 * 4. Create community in the category
 * 5. Create 55 member accounts to establish 55+ subscriptions
 * 6. Query page 1 with limit=10 and verify exactly 10 items returned
 * 7. Query page 2 with limit=10 and verify next 10 items
 * 8. Validate pagination metadata reflects custom limit and total counts
 */
export async function test_api_community_subscription_pagination_custom_limit(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@12345",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const categoryData = {
    name: "Technology",
    slug: "technology",
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

  // Step 3: Create member and authenticate as creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "Creator@12345",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 4: Create community
  const communityData = {
    name: "Tech Discussion",
    identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
    description: "A community for technology discussions",
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
    "community identifier matches",
    community.identifier,
    communityData.identifier,
  );

  // Step 5: Create 55 members to establish subscriptions
  // Note: Community creator is auto-subscribed (1), plus 55 = 56 total
  await ArrayUtil.asyncRepeat(55, async () => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          username: `user_${RandomGenerator.alphaNumeric(8)}`,
          password: "Member@12345",
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(member);
  });

  // Step 6: Re-authenticate as creator to query subscriptions
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "Creator@12345",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Query page 1 with limit=10
  const page1Request: ICommunityPlatformCommunitySubscription.IRequest = {
    page: 1,
    limit: 10,
  };

  const page1Result: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: page1Request,
      },
    );
  typia.assert(page1Result);

  // Validate page 1 results
  TestValidator.equals(
    "page 1 has exactly 10 items",
    page1Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 pagination limit is 10",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 total records >= 50",
    page1Result.pagination.records >= 50,
  );
  TestValidator.predicate(
    "page 1 total pages >= 5",
    page1Result.pagination.pages >= 5,
  );

  // Store first page IDs for comparison
  const page1Ids = page1Result.data.map((s) => s.id);

  // Query page 2 with limit=10
  const page2Request: ICommunityPlatformCommunitySubscription.IRequest = {
    page: 2,
    limit: 10,
  };

  const page2Result: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: page2Request,
      },
    );
  typia.assert(page2Result);

  // Validate page 2 results
  TestValidator.equals(
    "page 2 has exactly 10 items",
    page2Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 2 pagination limit is 10",
    page2Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 total records matches page 1",
    page2Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages matches page 1",
    page2Result.pagination.pages,
    page1Result.pagination.pages,
  );

  // Validate results are different between pages
  const page2Ids = page2Result.data.map((s) => s.id);
  TestValidator.predicate(
    "page 1 and page 2 have different results",
    !page1Ids.some((id) => page2Ids.includes(id)),
  );
}
