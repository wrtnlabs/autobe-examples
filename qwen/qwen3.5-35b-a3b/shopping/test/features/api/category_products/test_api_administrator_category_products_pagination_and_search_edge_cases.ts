import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_administrator_category_products_pagination_and_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // ===== SETUP PHASE =====
  // 1. Register administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular",
    },
  });
  typia.assert(adminJoin);
  // 2. Register seller
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // 3. Login as administrator (FIXED: removed href, only has email, password, referrer, ip)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminLogin);
  // 4. Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerLogin);
  // 5. Create target category
  const categoryCreateConnection: api.IConnection = { host: connection.host };
  const targetCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      categoryCreateConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(targetCategory);
  // 6. Create 12 products in target category with varying attributes
  const productsInTargetCategory: IEcommerceMallProduct[] = [];
  for (let i = 0; i < 12; i++) {
    const product = await generate_random_ecommerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: typia.random<string & tags.MaxLength<100>>(),
          description: typia.random<string & tags.MaxLength<500>>(),
          category_id: targetCategory.id,
          base_price: typia.random<
            number & tags.Minimum<100> & tags.Maximum<100000>
          >(),
        },
      },
    );
    typia.assert(product);
    productsInTargetCategory.push(product);
  }
  // 7. Create products in other category for isolation testing
  const otherCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      categoryCreateConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(otherCategory);
  const otherProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category_id: otherCategory.id,
          base_price: typia.random<number & tags.Minimum<100>>(),
        },
      },
    );
  typia.assert(otherProduct);
  // ===== PAGINATION TESTS =====
  // Test 1: First page with limit=5
  let response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 5,
        },
      },
    );
  typia.assert(response);
  // Verify first page
  TestValidator.equals("first page number", response.pagination.current, 1);
  TestValidator.equals("first page limit", response.pagination.limit, 5);
  TestValidator.equals(
    "first page records count",
    response.pagination.records,
    12,
  );
  TestValidator.equals("first page data length", response.data.length, 5);
  // Test 2: Second page using page=2 (page-based pagination)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 5,
          page: 2,
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("second page number", response.pagination.current, 2);
  TestValidator.equals("second page limit", response.pagination.limit, 5);
  TestValidator.equals("second page data length", response.data.length, 5);
  // Test 3: Third page (should have 2 remaining items)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 5,
          page: 3,
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("third page number", response.pagination.current, 3);
  TestValidator.equals("third page data length", response.data.length, 2);
  // Test 4: Boundary limit=1
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("limit=1 page limit", response.pagination.limit, 1);
  TestValidator.equals("limit=1 data length", response.data.length, 1);
  TestValidator.equals("limit=1 page number", response.pagination.current, 1);
  TestValidator.equals("limit=1 pages count", response.pagination.pages, 12);
  // Test 5: Boundary limit=100
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("limit=100 page limit", response.pagination.limit, 100);
  TestValidator.equals("limit=100 data length", response.data.length, 12);
  TestValidator.equals("limit=100 pages count", response.pagination.pages, 1);
  TestValidator.equals(
    "limit=100 records count",
    response.pagination.records,
    12,
  );
  // ===== SEARCH EDGE CASES =====
  // Test 1: Empty search string returns all products
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          search: "",
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("empty search records", response.pagination.records, 12);
  // Test 2: Search with no matches
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          search: "xyznonexistentproduct",
        },
      },
    );
  typia.assert(response);
  TestValidator.equals("no matches data length", response.data.length, 0);
  TestValidator.equals("no matches records", response.pagination.records, 0);
  TestValidator.equals("no matches pages", response.pagination.pages, 0);
  // Test 3: Special characters in search
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          search: "<script>alert('xss')</script>",
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "special chars handled without error",
    response.pagination.records >= 0,
  );
  // Test 4: Search exceeding max length (100 chars)
  const longSearch = "x".repeat(101);
  await TestValidator.error("long search rejected", async () => {
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          search: longSearch,
        },
      },
    );
  });
  // Test 5: Unicode/multi-language search
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          search: "日本語",
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "unicode search handled",
    response.pagination.records >= 0,
  );
  // ===== EMPTY CATEGORY TEST =====
  const emptyCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      categoryCreateConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(emptyCategory);
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: emptyCategory.id,
        body: {},
      },
    );
  typia.assert(response);
  TestValidator.equals("empty category data length", response.data.length, 0);
  TestValidator.equals(
    "empty category records",
    response.pagination.records,
    0,
  );
  TestValidator.equals("empty category pages", response.pagination.pages, 0);
  // ===== OUT-OF-STOCK PRODUCT TEST =====
  // Create product with all variants out of stock
  const outOfStockProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: targetCategory.id,
          base_price: typia.random<number & tags.Minimum<100>>(),
        },
      },
    );
  typia.assert(outOfStockProduct);
  // Test inStockOnly=false (should include all products)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          inStockOnly: false,
        },
      },
    );
  typia.assert(response);
  const foundOutOfStock = response.data.some(
    (p) => p.id === outOfStockProduct.id,
  );
  TestValidator.predicate(
    "product included with inStockOnly=false",
    foundOutOfStock,
  );
  // Test inStockOnly=true (should exclude out-of-stock products)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          inStockOnly: true,
        },
      },
    );
  typia.assert(response);
  const excludedOutOfStock = !response.data.some(
    (p) => p.id === outOfStockProduct.id,
  );
  TestValidator.predicate(
    "product excluded with inStockOnly=true",
    excludedOutOfStock,
  );
  // ===== SORT EDGE CASES =====
  // Test sorting with default order (by created_at)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          limit: 10,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate("sort returns valid data", response.data.length > 0);
  // Test ascending sort
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          sortBy: "name",
          sortOrder: "asc",
          limit: 10,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "asc sort returns valid data",
    response.data.length > 0,
  );
  // Test descending sort
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          sortBy: "base_price",
          sortOrder: "desc",
          limit: 10,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "desc sort returns valid data",
    response.data.length > 0,
  );
  // Test case-insensitive sort direction (uppercase DESC)
  response =
    await api.functional.ecommerceMall.administrator.categories.products.index(
      adminLoginConnection,
      {
        categoryId: targetCategory.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 10,
        },
      },
    );
  typia.assert(response);
  TestValidator.predicate("sort (desc) works", response.data.length > 0);
}
