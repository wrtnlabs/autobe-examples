import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test that the category listing endpoint returns categories with proper
 * pagination, sorting by display order, and respects page/limit parameters.
 *
 * This comprehensive test validates pagination functionality by:
 *
 * 1. Creating an administrator account
 * 2. Creating 5 categories with specific display orders
 * 3. Testing default pagination (page=1, limit=10) returns all categories in order
 * 4. Verifying pagination metadata accuracy
 * 5. Testing pagination with different limits and page numbers
 * 6. Validating sorting by display_order
 * 7. Testing boundary conditions (requests beyond last page)
 * 8. Testing limit enforcement (maximum 100)
 */
export async function test_api_category_listing_default_pagination(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create 5 categories with display orders 1, 2, 3, 4, 5
  const categories: ICommunityPlatformCategory[] = [];
  for (let i = 1; i <= 5; i++) {
    const category: ICommunityPlatformCategory =
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: `Category ${i}`,
            slug: `category-${i}`,
            description: `Description for category ${i}`,
            display_order: i,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    typia.assert(category);
    categories.push(category);
  }

  // 3. Test default pagination (page=1, limit=10)
  const defaultResult: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(defaultResult);

  // 4. Verify all 5 categories returned in order
  TestValidator.equals(
    "default pagination returns 5 categories",
    defaultResult.data.length,
    5,
  );
  TestValidator.equals(
    "categories in order - first",
    defaultResult.data[0].display_order,
    1,
  );
  TestValidator.equals(
    "categories in order - second",
    defaultResult.data[1].display_order,
    2,
  );
  TestValidator.equals(
    "categories in order - third",
    defaultResult.data[2].display_order,
    3,
  );
  TestValidator.equals(
    "categories in order - fourth",
    defaultResult.data[3].display_order,
    4,
  );
  TestValidator.equals(
    "categories in order - fifth",
    defaultResult.data[4].display_order,
    5,
  );

  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", defaultResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    defaultResult.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination total pages",
    defaultResult.pagination.pages,
    1,
  );

  // 6. Test with limit=2
  const limitTwoResult: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitTwoResult);

  TestValidator.equals(
    "limit=2 page 1 returns 2 categories",
    limitTwoResult.data.length,
    2,
  );
  TestValidator.equals(
    "limit=2 first category order",
    limitTwoResult.data[0].display_order,
    1,
  );
  TestValidator.equals(
    "limit=2 second category order",
    limitTwoResult.data[1].display_order,
    2,
  );
  TestValidator.equals(
    "limit=2 pagination pages",
    limitTwoResult.pagination.pages,
    3,
  );

  // 7. Request page 2 with limit=2
  const limitTwoPageTwo: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 2,
        limit: 2,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitTwoPageTwo);

  TestValidator.equals(
    "limit=2 page 2 returns 2 categories",
    limitTwoPageTwo.data.length,
    2,
  );
  TestValidator.equals(
    "limit=2 page 2 first category order",
    limitTwoPageTwo.data[0].display_order,
    3,
  );
  TestValidator.equals(
    "limit=2 page 2 second category order",
    limitTwoPageTwo.data[1].display_order,
    4,
  );

  // 8. Request page 3 with limit=2
  const limitTwoPageThree: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 3,
        limit: 2,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitTwoPageThree);

  TestValidator.equals(
    "limit=2 page 3 returns 1 category",
    limitTwoPageThree.data.length,
    1,
  );
  TestValidator.equals(
    "limit=2 page 3 category order",
    limitTwoPageThree.data[0].display_order,
    5,
  );

  // 9. Request page 4 with limit=2 (beyond end)
  const limitTwoPageFour: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 4,
        limit: 2,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitTwoPageFour);

  TestValidator.equals(
    "page 4 returns empty array",
    limitTwoPageFour.data.length,
    0,
  );

  // 10. Test limit=1
  const limitOneResult: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitOneResult);

  TestValidator.equals(
    "limit=1 returns 1 category",
    limitOneResult.data.length,
    1,
  );
  TestValidator.equals(
    "limit=1 pagination pages",
    limitOneResult.pagination.pages,
    5,
  );

  // 11. Test limit=50
  const limitFiftyResult: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitFiftyResult);

  TestValidator.equals(
    "limit=50 returns 5 categories",
    limitFiftyResult.data.length,
    5,
  );
  TestValidator.equals(
    "limit=50 pagination pages",
    limitFiftyResult.pagination.pages,
    1,
  );

  // 12. Test limit=100 (maximum)
  const limitHundredResult: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(limitHundredResult);

  TestValidator.equals(
    "limit=100 returns 5 categories",
    limitHundredResult.data.length,
    5,
  );
  TestValidator.equals(
    "limit=100 pagination limit",
    limitHundredResult.pagination.limit,
    100,
  );

  // 13. Verify sort order is ascending by display_order
  for (let i = 0; i < defaultResult.data.length - 1; i++) {
    TestValidator.predicate(
      `sort order ascending at position ${i}`,
      defaultResult.data[i].display_order <=
        defaultResult.data[i + 1].display_order,
    );
  }
}
