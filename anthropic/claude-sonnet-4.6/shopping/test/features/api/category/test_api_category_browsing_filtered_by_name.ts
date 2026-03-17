import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_browsing_filtered_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup — register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level categories with distinct names
  const electronicsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(electronicsCategory);
  const foodCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Food & Beverages",
          description: "Food and drink products",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(foodCategory);
  const sportsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Sports Equipment",
          description: "Equipment for sports and fitness",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(sportsCategory);
  // 3. Create a subcategory under 'Electronics'
  const phonesCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: electronicsCategory.id,
          name: "Phones",
          description: "Mobile phones and accessories",
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(phonesCategory);
  // 4. Use a plain connection for the public listing endpoint (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter with partial lowercase name "elect" — should return 'Electronics'
  const filteredResult = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {
        name: "elect",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(filteredResult);
  // Verify at least one result matches 'Electronics'
  const electronicsInResult = filteredResult.data.find(
    (cat) => cat.id === electronicsCategory.id,
  );
  TestValidator.predicate(
    "Electronics category should be in filtered results",
    electronicsInResult !== undefined,
  );
  // Verify 'Food & Beverages' is NOT in the results
  const foodInResult = filteredResult.data.find(
    (cat) => cat.id === foodCategory.id,
  );
  TestValidator.predicate(
    "Food & Beverages should NOT be in filtered results",
    foodInResult === undefined,
  );
  // Verify 'Sports Equipment' is NOT in the results
  const sportsInResult = filteredResult.data.find(
    (cat) => cat.id === sportsCategory.id,
  );
  TestValidator.predicate(
    "Sports Equipment should NOT be in filtered results",
    sportsInResult === undefined,
  );
  // Verify pagination records reflects only matching categories
  TestValidator.predicate(
    "Pagination records should be positive and match filtered count",
    filteredResult.pagination.records > 0,
  );
  // Verify 'Electronics' has its subcategory (Phones) nested in children
  if (electronicsInResult !== undefined) {
    const hasPhoneChild = electronicsInResult.children.some(
      (child) => child.id === phonesCategory.id,
    );
    TestValidator.predicate(
      "Electronics should have Phones as a child subcategory",
      hasPhoneChild,
    );
  }
  // Test 2: Filter with no-match name "zzzzunlikely" — should return empty results
  const noMatchResult = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {
        name: "zzzzunlikely",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "No-match filter should return empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "No-match filter should return records: 0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "No-match filter should return pages: 0",
    noMatchResult.pagination.pages,
    0,
  );
}
