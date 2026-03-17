import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the basic product search functionality returning products from approved sellers with correct visibility rules.
 *
 * **Precondition Setup:**
 * 1. Create a seller account (approved status) with shop name 'TechStore'
 * 2. Create a parent category 'Electronics' and a subcategory 'Smartphones' under it
 * 3. Create 3 products under the approved seller:
 *    - Product A: name 'Smartphone X', base_price 500, category 'Smartphones', with in-stock variant
 *    - Product B: name 'Phone Case', base_price 25, category 'Electronics', with in-stock variant
 *    - Product C: name 'Headphones', base_price 100, category 'Electronics', with in-stock variant
 *
 * **Test Execution:**
 * 1. Send PATCH request to /shoppingMall/products/search with empty request body (no filters)
 * 2. Verify response contains pagination metadata with current page, limit, total records, and total pages
 * 3. Verify all 3 products appear in results
 * 4. Verify each product summary includes: id, name, base_price, category object (id, name), seller object (id, shop_name)
 * 5. Verify products are sorted by created_at DESC (newest first - default)
 *
 * **Validation Points:**
 * - All products from approved seller are visible
 * - Category hierarchy is correctly returned in product summaries
 * - Seller information is correctly embedded in each product
 * - Pagination metadata is accurate (current: 1, limit: default, records: 3, pages: 1)
 * - Products with 'phone' in name can be found via partial matching
 */
export async function test_api_product_search_approved_sellers_visible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create Categories
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
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: "Smartphones",
          description: "Smartphone devices",
        },
      },
    );
  typia.assert(subcategory);
  // 3. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: "TechStore",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Create Products
  const productA =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Smartphone X",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: subcategory.id,
          basePrice: 500,
        },
      },
    );
  typia.assert(productA);
  const productB =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Phone Case",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: parentCategory.id,
          basePrice: 25,
        },
      },
    );
  typia.assert(productB);
  const productC =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Headphones",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          categoryId: parentCategory.id,
          basePrice: 100,
        },
      },
    );
  typia.assert(productC);
  // 5. Execute Search (empty body = no filters)
  const searchResult = await api.functional.shoppingMall.products.search.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(searchResult);
  // 6. Validate Pagination Metadata
  TestValidator.equals("current page", searchResult.pagination.current, 1);
  TestValidator.equals("total records", searchResult.pagination.records, 3);
  TestValidator.equals("total pages", searchResult.pagination.pages, 1);
  // 7. Validate All Products Present
  TestValidator.equals("product count", searchResult.data.length, 3);
  // 8. Validate Product IDs are present
  const productIds = searchResult.data.map((p) => p.id);
  TestValidator.predicate(
    "productA in results",
    productIds.includes(productA.id),
  );
  TestValidator.predicate(
    "productB in results",
    productIds.includes(productB.id),
  );
  TestValidator.predicate(
    "productC in results",
    productIds.includes(productC.id),
  );
  // 9. Validate Products Sorted by created_at DESC
  const createdDates = searchResult.data.map((p) => p.created_at);
  for (let i = 0; i < createdDates.length - 1; i++) {
    TestValidator.predicate(
      "products sorted by created_at DESC",
      new Date(createdDates[i]) >= new Date(createdDates[i + 1]),
    );
  }
  // 10. Validate Category Hierarchy in Products
  for (const product of searchResult.data) {
    if (product.category.name === "Smartphones") {
      TestValidator.equals(
        "Smartphones parent is Electronics",
        product.category.parent?.name,
        "Electronics",
      );
    }
    if (product.category.name === "Electronics" && product.id !== productA.id) {
      TestValidator.equals(
        "Electronics parent is null",
        product.category.parent,
        null,
      );
    }
  }
  // 11. Validate Seller Information in Products
  for (const product of searchResult.data) {
    TestValidator.equals(
      "seller shop_name matches",
      product.seller.shop_name,
      "TechStore",
    );
  }
  // 12. Test Partial Matching with 'phone'
  const phoneSearchResult =
    await api.functional.shoppingMall.products.search.index(connection, {
      body: {
        search: "phone",
      },
    });
  typia.assert(phoneSearchResult);
  const phoneProductNames = phoneSearchResult.data.map((p) => p.name);
  TestValidator.predicate(
    "Smartphone X found by partial match",
    phoneProductNames.includes("Smartphone X"),
  );
  TestValidator.predicate(
    "Phone Case found by partial match",
    phoneProductNames.includes("Phone Case"),
  );
}
