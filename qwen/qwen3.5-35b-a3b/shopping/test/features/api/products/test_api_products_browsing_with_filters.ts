import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_products_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  typia.assert(sellerAuthorized.token);
  // Create seller-specific connection with token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuthorized.token.access,
    },
  };
  // Step 2: Create test products with varying prices in same category
  const products: IEcommerceMallProduct[] = [];
  // Create low-priced products
  const lowPriceProduct1 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Budget Item A",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 1000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(lowPriceProduct1);
  products.push(lowPriceProduct1);
  const lowPriceProduct2 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Budget Item B",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 2000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(lowPriceProduct2);
  products.push(lowPriceProduct2);
  // Create medium-priced products
  const mediumPriceProduct1 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Standard Item A",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 10000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(mediumPriceProduct1);
  products.push(mediumPriceProduct1);
  const mediumPriceProduct2 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Standard Item B",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 15000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(mediumPriceProduct2);
  products.push(mediumPriceProduct2);
  // Create high-priced products
  const highPriceProduct1 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Premium Item A",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 30000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(highPriceProduct1);
  products.push(highPriceProduct1);
  const highPriceProduct2 =
    await api.functional.ecommerceMall.seller.products.create(
      sellerAuthConnection,
      {
        body: {
          name: "Premium Item B",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: 50000,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(highPriceProduct2);
  products.push(highPriceProduct2);
  // Step 3: Test category filtering
  const categoryFilterPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        category_id: products[0].category.id,
        page: 1,
        page_size: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(categoryFilterPage);
  // Verify only products in specified category are returned
  const filteredProducts = categoryFilterPage.data;
  TestValidator.equals(
    "products in category count",
    filteredProducts.length,
    1,
  );
  for (const product of filteredProducts) {
    typia.assert(product);
    TestValidator.equals(
      "category_id matches filter",
      product.category.id,
      products[0].category.id,
    );
  }
  // Step 4: Test price range filtering
  const priceRangePage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        base_price_min: 5000,
        base_price_max: 25000,
        page: 1,
        page_size: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceRangePage);
  const priceFilteredProducts = priceRangePage.data;
  for (const product of priceFilteredProducts) {
    typia.assert(product);
    TestValidator.predicate(
      "product price within range",
      product.base_price >= 5000 && product.base_price <= 25000,
    );
  }
  // Step 5: Test sorting (ascending by base_price)
  const sortedPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        sort_by: "base_price",
        sort_order: "asc",
        page: 1,
        page_size: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(sortedPage);
  const sortedProducts = sortedPage.data;
  for (let i = 1; i < sortedProducts.length; i++) {
    TestValidator.predicate(
      "products sorted ascending by price",
      sortedProducts[i].base_price >= sortedProducts[i - 1].base_price,
    );
  }
  // Step 6: Test pagination with page_size=10
  const paginationPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        page: 1,
        page_size: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(paginationPage);
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginationPage.pagination.current,
    1,
  );
  TestValidator.equals("page_size is 10", paginationPage.pagination.limit, 10);
  TestValidator.predicate(
    "records is greater than 0",
    paginationPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    paginationPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "page_size limit respected",
    paginationPage.data.length <= 10,
  );
  // Step 7: Verify product summary fields
  const sampleProduct = sortedProducts[0];
  typia.assert(sampleProduct);
  TestValidator.notEquals("product has id", sampleProduct.id, undefined);
  TestValidator.notEquals("product has name", sampleProduct.name, undefined);
  TestValidator.predicate(
    "product has base_price",
    sampleProduct.base_price > 0,
  );
  TestValidator.notEquals("product has slug", sampleProduct.slug, undefined);
  TestValidator.notEquals(
    "product has status",
    sampleProduct.status,
    undefined,
  );
  TestValidator.notEquals(
    "product has category",
    sampleProduct.category,
    undefined,
  );
  TestValidator.notEquals(
    "category has id",
    sampleProduct.category.id,
    undefined,
  );
  TestValidator.notEquals(
    "category has name",
    sampleProduct.category.name,
    undefined,
  );
  TestValidator.notEquals(
    "category has slug",
    sampleProduct.category.slug,
    undefined,
  );
  TestValidator.notEquals(
    "product has deleted_at",
    sampleProduct.deleted_at,
    undefined,
  );
  // Step 8: Verify no deleted products in results (deleted_at should be null)
  for (const product of sortedProducts) {
    typia.assert(product);
    TestValidator.predicate(
      "product is not deleted",
      product.deleted_at === null,
    );
  }
  // Step 9: Test status filtering (active)
  const activeStatusPage = await api.functional.ecommerceMall.products.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        page_size: 100,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(activeStatusPage);
  const activeProducts = activeStatusPage.data;
  for (const product of activeProducts) {
    typia.assert(product);
    TestValidator.equals("product status is active", product.status, "active");
  }
}