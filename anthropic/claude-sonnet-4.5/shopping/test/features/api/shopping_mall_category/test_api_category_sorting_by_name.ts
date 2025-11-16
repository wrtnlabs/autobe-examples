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
 * Test category sorting using the name field with both ascending and descending
 * order.
 *
 * This test validates that categories are returned in correct alphabetical
 * order when sort_by is set to 'name'. It tests both ascending (A-Z) and
 * descending (Z-A) directions to ensure proper sorting implementation for
 * intuitive category browsing.
 *
 * Steps:
 *
 * 1. Authenticate as admin to gain category creation permissions
 * 2. Create multiple test categories with distinct alphabetical names
 * 3. Test ascending sort and verify alphabetical A-Z ordering
 * 4. Test descending sort and verify reverse Z-A ordering
 */
export async function test_api_category_sorting_by_name(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create test categories with different names for sorting validation
  const categoryNames = ["Zebra", "Apple", "Mango", "Banana", "Cherry"];
  const createdCategories: IShoppingMallCategory[] = [];

  for (const name of categoryNames) {
    const category = await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          name: name,
          slug: name.toLowerCase(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 3: Test ascending sort (A-Z)
  const ascendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(ascendingResult);

  // Verify ascending order
  const ascNames = ascendingResult.data
    .filter((cat) => categoryNames.includes(cat.name))
    .map((cat) => cat.name);
  const expectedAscending = [...categoryNames].sort();
  TestValidator.equals("ascending sort order", ascNames, expectedAscending);

  // Step 4: Test descending sort (Z-A)
  const descendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "name",
        sort_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(descendingResult);

  // Verify descending order
  const descNames = descendingResult.data
    .filter((cat) => categoryNames.includes(cat.name))
    .map((cat) => cat.name);
  const expectedDescending = [...categoryNames].sort().reverse();
  TestValidator.equals("descending sort order", descNames, expectedDescending);
}
