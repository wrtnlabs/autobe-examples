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
 * Test that retrieving children of a category that has no child categories
 * returns an empty result set with proper structure.
 *
 * This test validates the edge case where a leaf category (category with no
 * children) is queried for its children. It ensures that:
 *
 * 1. Admin creates a leaf category (category with no children)
 * 2. Request the children of this leaf category
 * 3. Verify the response returns an empty data array
 * 4. Verify pagination metadata correctly indicates zero records and zero pages
 * 5. Verify the response structure matches the expected schema even with no data
 * 6. The operation completes successfully without errors despite having no results
 *
 * This ensures proper handling of edge cases where categories exist but have no
 * subcategories, which is common for leaf nodes in the category hierarchy.
 */
export async function test_api_category_children_empty_result(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create test category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a leaf category (category with no children)
  const leafCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(leafCategory);

  // Step 3: Request the children of this leaf category
  const childrenResponse: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.children.index(connection, {
      categoryId: leafCategory.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(childrenResponse);

  // Step 4: Verify the response returns an empty data array
  TestValidator.equals(
    "children data array should be empty",
    childrenResponse.data,
    [],
  );

  // Step 5: Verify pagination metadata correctly indicates zero records
  TestValidator.equals(
    "pagination records should be 0",
    childrenResponse.pagination.records,
    0,
  );

  // Step 6: Verify pagination metadata correctly indicates zero pages
  TestValidator.equals(
    "pagination pages should be 0",
    childrenResponse.pagination.pages,
    0,
  );

  // Step 7: Verify the current page is valid (should be 0 or 1 for empty results)
  TestValidator.predicate(
    "pagination current should be valid for empty results",
    childrenResponse.pagination.current === 0 ||
      childrenResponse.pagination.current === 1,
  );

  // Step 8: Verify the limit is as requested
  TestValidator.equals(
    "pagination limit should match request",
    childrenResponse.pagination.limit,
    10,
  );
}
