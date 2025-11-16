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
 * Test category listing with multiple sort options and directions.
 *
 * Validates that the category listing endpoint correctly handles sorting by
 * display_order, name, and created_at fields in both ascending and descending
 * directions. Creates categories with specific properties to test sort
 * functionality and verifies results are returned in expected order.
 *
 * Test flow:
 *
 * 1. Create administrator account for API access
 * 2. Create three categories with staggered creation times and display orders:
 *
 *    - Technology (display_order: 10)
 *    - Entertainment (display_order: 5)
 *    - Sports (display_order: 15)
 * 3. Test sorting by display_order (ascending and descending)
 * 4. Test sorting by name (ascending and descending)
 * 5. Test sorting by created_at (ascending and descending)
 * 6. Verify results match expected order for each sort combination
 * 7. Test pagination with sorted results
 */
export async function test_api_category_listing_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create three categories with delays and specific display orders
  const category1Data = {
    name: "Technology",
    slug: "technology",
    description: "Tech and computing topics",
    display_order: 10,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category1: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: category1Data,
      },
    );
  typia.assert(category1);

  // Add delay between creations
  await new Promise((resolve) => setTimeout(resolve, 100));

  const category2Data = {
    name: "Entertainment",
    slug: "entertainment",
    description: "Movies, shows, and entertainment",
    display_order: 5,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category2: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: category2Data,
      },
    );
  typia.assert(category2);

  // Add delay between creations
  await new Promise((resolve) => setTimeout(resolve, 100));

  const category3Data = {
    name: "Sports",
    slug: "sports",
    description: "Sports and athletics",
    display_order: 15,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category3: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: category3Data,
      },
    );
  typia.assert(category3);

  // 3. Test sort_by='display_order', order='asc'
  const displayOrderAsc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "display_order",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(displayOrderAsc);

  // Filter to our created categories
  const displayOrderAscFiltered = displayOrderAsc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "display_order ascending order should be Entertainment(5), Technology(10), Sports(15)",
    displayOrderAscFiltered.map((c) => c.display_order),
    [5, 10, 15],
  );

  // 4. Test sort_by='display_order', order='desc'
  const displayOrderDesc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "display_order",
        order: "desc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(displayOrderDesc);

  const displayOrderDescFiltered = displayOrderDesc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "display_order descending order should be Sports(15), Technology(10), Entertainment(5)",
    displayOrderDescFiltered.map((c) => c.display_order),
    [15, 10, 5],
  );

  // 5. Test sort_by='name', order='asc'
  const nameAsc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "name",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(nameAsc);

  const nameAscFiltered = nameAsc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "name ascending order should be Entertainment, Sports, Technology",
    nameAscFiltered.map((c) => c.name),
    ["Entertainment", "Sports", "Technology"],
  );

  // 6. Test sort_by='name', order='desc'
  const nameDesc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "name",
        order: "desc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(nameDesc);

  const nameDescFiltered = nameDesc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "name descending order should be Technology, Sports, Entertainment",
    nameDescFiltered.map((c) => c.name),
    ["Technology", "Sports", "Entertainment"],
  );

  // 7. Test sort_by='created_at', order='asc'
  const createdAtAsc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(createdAtAsc);

  const createdAtAscFiltered = createdAtAsc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "created_at ascending order should be category1, category2, category3",
    createdAtAscFiltered.map((c) => c.id),
    [category1.id, category2.id, category3.id],
  );

  // 8. Test sort_by='created_at', order='desc'
  const createdAtDesc: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(createdAtDesc);

  const createdAtDescFiltered = createdAtDesc.data.filter((c) =>
    [category1.id, category2.id, category3.id].includes(c.id),
  );
  TestValidator.equals(
    "created_at descending order should be category3, category2, category1",
    createdAtDescFiltered.map((c) => c.id),
    [category3.id, category2.id, category1.id],
  );

  // 9. Test default sort (no sort_by specified)
  const defaultSort: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort should return valid paginated results",
    defaultSort.data.length > 0,
  );

  // 10. Test pagination with sorted results
  const paginatedResults: IPageICommunityPlatformCategory =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 2,
        sort_by: "display_order",
        order: "asc",
      } satisfies ICommunityPlatformCategory.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination should respect limit parameter",
    paginatedResults.data.length <= 2,
  );
  TestValidator.equals(
    "pagination metadata should be correct",
    paginatedResults.pagination.limit,
    2,
  );
}
