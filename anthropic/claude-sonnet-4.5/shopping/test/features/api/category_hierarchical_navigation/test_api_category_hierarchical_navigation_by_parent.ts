import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test hierarchical category navigation by filtering categories using
 * parent_id.
 *
 * This test validates the ability to navigate through the category tree
 * structure by querying for child categories of a specific parent category. It
 * ensures that the category hierarchy system properly supports drill-down
 * navigation where users can explore subcategories level by level.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to gain category management privileges
 * 2. Create a parent category at the root level (parent_id = null)
 * 3. Create multiple child categories under that parent category
 * 4. Query categories filtering by the parent's UUID
 * 5. Validate that only direct children of that parent are returned
 * 6. Verify response structure and data integrity
 */
export async function test_api_category_hierarchical_navigation_by_parent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a parent category (root-level)
  const parentCategoryData = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: parentCategoryData,
    });
  typia.assert(parentCategory);

  // Step 3: Create multiple child categories under the parent
  const childCount = 3;
  const childCategories = await ArrayUtil.asyncRepeat(
    childCount,
    async (index) => {
      const childData = {
        parent_id: parentCategory.id,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: index,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate;

      const child = await api.functional.shoppingMall.admin.categories.create(
        connection,
        {
          body: childData,
        },
      );
      typia.assert(child);
      return child;
    },
  );

  // Step 4: Query categories by parent_id to retrieve only direct children
  const filterRequest = {
    parent_id: parentCategory.id,
    page: 1,
    limit: 10,
    status: "active" as const,
  } satisfies IShoppingMallCategory.IRequest;

  const filteredResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: filterRequest,
    },
  );
  typia.assert(filteredResult);

  // Step 5: Validate that only direct children are returned
  TestValidator.equals(
    "filtered result should contain exactly the created child categories",
    filteredResult.data.length,
    childCount,
  );

  // Step 6: Verify all returned categories have the correct parent_id
  for (const category of filteredResult.data) {
    TestValidator.equals(
      "category parent_id should match the parent category",
      category.parent_id,
      parentCategory.id,
    );
  }

  // Step 7: Verify that all created child categories are present in the result
  const returnedIds = filteredResult.data.map((c) => c.id);
  const expectedIds = childCategories.map((c) => c.id);

  for (const expectedId of expectedIds) {
    TestValidator.predicate(
      "all created child categories should be present in results",
      returnedIds.includes(expectedId),
    );
  }

  // Step 8: Validate pagination metadata
  TestValidator.equals(
    "pagination records should match child count",
    filteredResult.pagination.records,
    childCount,
  );
}
