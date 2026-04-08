import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test that category snapshots endpoint works correctly and returns proper structure.
 *
 * Validates the category snapshot retrieval functionality including authentication, category creation, and snapshot query response validation. Ensures that the snapshots endpoint returns properly structured data with pagination information.
 *
 * Note: Due to API limitations (no update/delete endpoints available), this test validates the snapshot endpoint structure and response format rather than the full "preserved after deletion" scenario. The test creates a category and verifies that the snapshots endpoint returns valid response structure with correct pagination.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. Administrator creates a new category with initial name and description.
 * 3. Administrator retrieves snapshots for the created category.
 * 4. Validates that the snapshot response contains proper pagination and data structure.
 * 5. Validates that snapshot records (if any) contain complete before/after field values.
 */
export async function test_api_category_snapshots_preserved_after_category_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create a new category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Test Category for Snapshot Validation",
          description:
            "This category is created to validate snapshot endpoint functionality and response structure.",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Retrieve snapshots for the created category
  const snapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {} satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has record count",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has page count",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate data array structure
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  // 6. If snapshots exist, validate their structure
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    typia.assert(firstSnapshot);
    // Validate snapshot has required fields
    TestValidator.predicate("snapshot has id", firstSnapshot.id.length > 0);
    TestValidator.equals(
      "snapshot references category",
      firstSnapshot.shopping_mall_category_id,
      category.id,
    );
    TestValidator.predicate(
      "snapshot has name_before",
      firstSnapshot.name_before.length > 0,
    );
    TestValidator.predicate(
      "snapshot has name_after",
      firstSnapshot.name_after.length > 0,
    );
    TestValidator.predicate(
      "snapshot has description_before",
      firstSnapshot.description_before.length > 0,
    );
    TestValidator.predicate(
      "snapshot has description_after",
      firstSnapshot.description_after.length > 0,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at.length > 0,
    );
    // Validate parent_category_id fields exist (can be null)
    TestValidator.predicate(
      "snapshot has parent_category_id_before or null",
      firstSnapshot.parent_category_id_before === null ||
        firstSnapshot.parent_category_id_before.length > 0,
    );
    TestValidator.predicate(
      "snapshot has parent_category_id_after or null",
      firstSnapshot.parent_category_id_after === null ||
        firstSnapshot.parent_category_id_after.length > 0,
    );
  }
  // 7. Test pagination with limit parameter
  const paginatedSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          limit: 10,
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit applied",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 8. Test with page parameter
  const pageSnapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(pageSnapshots);
  TestValidator.equals(
    "pagination current page",
    pageSnapshots.pagination.current,
    1,
  );
}
