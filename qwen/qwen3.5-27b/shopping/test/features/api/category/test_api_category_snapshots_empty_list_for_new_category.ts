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
 * Test retrieving snapshots for a newly created category that has not been modified.
 *
 * Validates that the snapshots endpoint correctly returns an empty list when querying a category that has never been modified. This ensures the endpoint handles categories with no modification history gracefully and returns properly formatted pagination metadata even when zero snapshots exist.
 *
 * The test verifies that empty snapshot lists are valid responses and do not cause errors, while confirming the pagination structure is correct with records=0, pages=0, and current=1.
 *
 * 1. Authenticate as administrator to gain category creation privileges.
 * 2. Create a new category without any modifications.
 * 3. Retrieve snapshots for the newly created category.
 * 4. Validate response contains empty data array and correct pagination metadata.
 */
export async function test_api_category_snapshots_empty_list_for_new_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a new category (no modifications, so no snapshots will exist)
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Retrieve snapshots for the newly created category
  const snapshots =
    await api.functional.shoppingMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {} satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate response contains empty data array
  TestValidator.equals("snapshots data is empty", snapshots.data.length, 0);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination records is 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", snapshots.pagination.pages, 0);
  TestValidator.equals(
    "pagination current is 1",
    snapshots.pagination.current,
    1,
  );
}
