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
 * Test category sorting using the created_at timestamp field.
 *
 * This test validates the ability to sort categories chronologically by their
 * creation timestamps, enabling users to browse categories by creation date.
 *
 * The test workflow:
 *
 * 1. Authenticate as admin to gain category creation permissions
 * 2. Create multiple categories sequentially to establish distinct timestamps
 * 3. Retrieve categories sorted by created_at in ascending order (earliest first)
 * 4. Verify categories are returned in correct chronological order
 * 5. Retrieve categories sorted by created_at in descending order (latest first)
 * 6. Verify categories are returned in reverse chronological order
 *
 * This ensures the sorting functionality works correctly for both ascending and
 * descending directions, supporting use cases like finding recently added
 * categories or viewing complete category creation history.
 */
export async function test_api_category_sorting_by_created_at(
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

  // Step 2: Create multiple categories sequentially with small delays
  const createdCategories: IShoppingMallCategory[] = [];
  const categoryCount = 5;

  for (let i = 0; i < categoryCount; i++) {
    const category = await api.functional.shoppingMall.admin.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${i + 1} ${RandomGenerator.alphaNumeric(6)}`,
          slug: `test-category-${i + 1}-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: i,
          status: "active",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
    typia.assert(category);
    createdCategories.push(category);

    // Small delay to ensure distinct timestamps
    if (i < categoryCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 3: Test ascending sort order (earliest to latest)
  const ascendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_direction: "asc",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(ascendingResult);

  // Step 4: Verify ascending order
  const ascendingCategories = ascendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  TestValidator.predicate(
    "ascending sort should return all created categories",
    ascendingCategories.length === categoryCount,
  );

  for (let i = 0; i < ascendingCategories.length - 1; i++) {
    const current = new Date(ascendingCategories[i].created_at).getTime();
    const next = new Date(ascendingCategories[i + 1].created_at).getTime();

    TestValidator.predicate(
      `ascending order: category ${i} created_at should be <= category ${i + 1} created_at`,
      current <= next,
    );
  }

  // Step 5: Test descending sort order (latest to earliest)
  const descendingResult = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_direction: "desc",
        limit: 100,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(descendingResult);

  // Step 6: Verify descending order
  const descendingCategories = descendingResult.data.filter((cat) =>
    createdCategories.some((created) => created.id === cat.id),
  );

  TestValidator.predicate(
    "descending sort should return all created categories",
    descendingCategories.length === categoryCount,
  );

  for (let i = 0; i < descendingCategories.length - 1; i++) {
    const current = new Date(descendingCategories[i].created_at).getTime();
    const next = new Date(descendingCategories[i + 1].created_at).getTime();

    TestValidator.predicate(
      `descending order: category ${i} created_at should be >= category ${i + 1} created_at`,
      current >= next,
    );
  }
}
