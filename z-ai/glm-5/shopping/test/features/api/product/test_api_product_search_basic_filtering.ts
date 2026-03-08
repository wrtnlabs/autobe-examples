import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_product_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // Setup: Create parent category 'Electronics'
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // Setup: Create subcategory 'Smartphones' under 'Electronics'
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and smartphones",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // Setup: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  // Setup: Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test 1: Search without any filters - verify response structure
  const noFilterResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: {} },
  );
  typia.assert(noFilterResult);
  // Test 2: Search by product name keyword - case-insensitive partial matching
  const searchKeyword = "phone";
  const keywordSearchResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: { search: searchKeyword } },
  );
  typia.assert(keywordSearchResult);
  // Test 3: Filter by parent category (hierarchical - includes subcategories)
  const categoryFilterResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: { shopping_mall_category_id: parentCategory.id } },
  );
  typia.assert(categoryFilterResult);
  // Test 4: Filter by subcategory only
  const subcategoryFilterResult =
    await api.functional.shoppingMall.products.index(connection, {
      body: { shopping_mall_category_id: subcategory.id },
    });
  typia.assert(subcategoryFilterResult);
  // Test 5: Filter by price range
  const minPrice = 100;
  const maxPrice = 1000;
  const priceFilterResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: { min_price: minPrice, max_price: maxPrice } },
  );
  typia.assert(priceFilterResult);
  // Validate products are within specified price range
  for (const product of priceFilterResult.data) {
    TestValidator.predicate(
      "product within price range",
      product.min_price >= minPrice && product.max_price <= maxPrice,
    );
  }
  // Test 6: Filter by in_stock=true
  const inStockResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: { in_stock: true } },
  );
  typia.assert(inStockResult);
  // Validate all returned products are in stock
  for (const product of inStockResult.data) {
    TestValidator.equals("product is in stock", product.out_of_stock, false);
  }
  // Test 7: Combine multiple filters
  const combinedFilterResult = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        search: "phone",
        shopping_mall_category_id: parentCategory.id,
        min_price: 50,
        max_price: 2000,
        in_stock: true,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(combinedFilterResult);
  // Test 8: Pagination parameters
  const paginatedResult = await api.functional.shoppingMall.products.index(
    connection,
    { body: { page: 1, limit: 5 } },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "limit parameter respected",
    paginatedResult.data.length <= 5,
  );
}
