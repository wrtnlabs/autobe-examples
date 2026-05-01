import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test category browsing with price filtering, in-stock filtering, sort ordering, and pagination.
 *
 * Validates that the customer category browsing endpoint correctly applies optional query
 * parameters — price range filtering, in-stock-only filtering, sort ordering, and pagination —
 * within a scoped category context. Ensures that products outside the price range are excluded,
 * out-of-stock products are hidden when the in-stock filter is active, sort orders produce
 * correct price sequences, and pagination returns the expected page size with accurate metadata.
 *
 * 1. Administrator creates a top-level category for product assignment.
 * 2. Administrator registers and approves a seller so they can create products.
 * 3. Seller creates four products in the category at price points $10, $25, $50, and $80:
 *    - $10, $25, $50 products each get a variant with positive inventory stock.
 *    - $80 product gets a variant but intentionally no inventory stock (stock = 0).
 * 4. Customer browses with price filter $20–$60. Asserts only $25 and $50 products returned.
 * 5. Customer browses with in-stock-only filter. Asserts $10, $25, $50 returned; $80 excluded.
 * 6. Customer browses with price ascending sort. Asserts products ordered lowest to highest.
 * 7. Customer browses with price descending sort. Asserts products ordered highest to lowest.
 * 8. Customer browses with pagination (page 1, limit 2). Asserts exactly 2 products returned
 *    with correct pagination metadata (current, limit, records, pages).
 */
export async function test_api_category_browsing_with_filter_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — use explicit credentials for later re-login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join({ host: connection.host } as api.IConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // 3. Create products at $10, $25, $50, $80
  const product10 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 10,
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product10);
  const variant10 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product10.id },
      },
    );
  typia.assert(variant10);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product10.id,
        variantId: variant10.id,
      },
    },
  );
  const product25 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 25,
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product25);
  const variant25 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product25.id },
      },
    );
  typia.assert(variant25);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product25.id,
        variantId: variant25.id,
      },
    },
  );
  const product50 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 50,
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product50);
  const variant50 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product50.id },
      },
    );
  typia.assert(variant50);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product50.id,
        variantId: variant50.id,
      },
    },
  );
  const product80 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: 80,
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product80);
  const variant80 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product80.id },
        body: { initialStockQuantity: 0 },
      },
    );
  typia.assert(variant80);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Price filter $20–$60
  const priceFilterResult =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: category.id,
        body: {
          min_price: 20 satisfies number as number,
          max_price: 60 satisfies number as number,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  const priceFilterIds = priceFilterResult.data.map((p) => p.id);
  TestValidator.predicate(
    "price filter $20-$60 includes $25 product",
    priceFilterIds.includes(product25.id),
  );
  TestValidator.predicate(
    "price filter $20-$60 includes $50 product",
    priceFilterIds.includes(product50.id),
  );
  TestValidator.predicate(
    "price filter $20-$60 excludes $10 product",
    !priceFilterIds.includes(product10.id),
  );
  TestValidator.predicate(
    "price filter $20-$60 excludes $80 product",
    !priceFilterIds.includes(product80.id),
  );
  // 6. In-stock-only filter
  const inStockResult =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: category.id,
        body: {
          in_stock_only: true,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(inStockResult);
  const inStockIds = inStockResult.data.map((p) => p.id);
  TestValidator.predicate(
    "in-stock filter includes $10 product",
    inStockIds.includes(product10.id),
  );
  TestValidator.predicate(
    "in-stock filter includes $25 product",
    inStockIds.includes(product25.id),
  );
  TestValidator.predicate(
    "in-stock filter includes $50 product",
    inStockIds.includes(product50.id),
  );
  TestValidator.predicate(
    "in-stock filter excludes $80 product (no stock)",
    !inStockIds.includes(product80.id),
  );
  // 7. Price ascending sort
  const ascResult =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: category.id,
        body: {
          sort: "price_asc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(ascResult);
  const ascPrices = ascResult.data.map((p) => p.base_price);
  TestValidator.predicate(
    "price ascending: correctly ordered",
    ascPrices[0] <= ascPrices[1] &&
      ascPrices[1] <= ascPrices[2] &&
      ascPrices[2] <= ascPrices[3],
  );
  // 8. Price descending sort
  const descResult =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: category.id,
        body: {
          sort: "price_desc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(descResult);
  const descPrices = descResult.data.map((p) => p.base_price);
  TestValidator.predicate(
    "price descending: correctly ordered",
    descPrices[0] >= descPrices[1] &&
      descPrices[1] >= descPrices[2] &&
      descPrices[2] >= descPrices[3],
  );
  // 9. Pagination (page 1, limit 2)
  const pageResult =
    await api.functional.shoppingMall.customer.categories.products.index(
      customerConnection,
      {
        categoryId: category.id,
        body: {
          page: 1 satisfies number as number,
          limit: 2 satisfies number as number,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "pagination: exactly 2 products on page 1",
    pageResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination: current page is 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is 2",
    pageResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination: total records is 4",
    pageResult.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination: total pages is 2",
    pageResult.pagination.pages,
    2,
  );
}
