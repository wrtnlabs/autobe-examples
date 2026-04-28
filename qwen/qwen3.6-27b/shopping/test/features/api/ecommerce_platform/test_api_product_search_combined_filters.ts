import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test product search with combined filters including price range, stock availability, and sorting.
 *
 * Validates the complete product search workflow where a seller creates products at different price points with varying inventory levels, and a customer performs filtered searches. Ensures that stock availability filtering correctly excludes out-of-stock items, price range filters narrow results accurately, and sort orders are properly respected.
 *
 * Also verifies pagination metadata correctness and that products without images display null thumbnailUri while products without reviews display null averageRating.
 *
 * 1. Seller registers and creates products at different price points ($10, $50, $100).
 * 2. Seller creates variants for each product and adds inventory to some (stock > 0) but not all (stock = 0).
 * 3. Customer registers for authenticated search access.
 * 4. Search with inStockOnly=true returns only stocked products.
 * 5. Search combining minPrice=20, maxPrice=75, inStockOnly=true returns only in-range stocked products.
 * 6. Search with sortBy=priceAsc returns ascending order, sortBy=priceDesc returns descending order.
 * 7. Validates pagination metadata consistency.
 * 8. Verifies null fields for products without images or reviews.
 */
export async function test_api_product_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create products at different price points
  const product1 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { base_price: 10 },
      },
    );
  typia.assert(product1);
  const product2 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { base_price: 50 },
      },
    );
  typia.assert(product2);
  const product3 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { base_price: 100 },
      },
    );
  typia.assert(product3);
  // 3. Create variants for each product
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product3.id },
      },
    );
  typia.assert(variant3);
  // 4. Add inventory - product1 and product2 have stock, product3 has none
  const inventory1 =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: { quantity_delta: 10, reason: "Initial stock for product 1" },
        params: { productId: product1.id, variantId: variant1.id },
      },
    );
  typia.assert(inventory1);
  const inventory2 =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: { quantity_delta: 5, reason: "Initial stock for product 2" },
        params: { productId: product2.id, variantId: variant2.id },
      },
    );
  typia.assert(inventory2);
  // variant3: no inventory added, stock remains 0
  // 5. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Search with inStockOnly=true - products 1 and 2 should appear, product 3 excluded
  const searchInStockBody = {
    inStockOnly: true,
    limit: 100,
  } satisfies IEcommercePlatformProduct.ISearch;
  const resultInStock = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: searchInStockBody,
    },
  );
  typia.assert(resultInStock);
  TestValidator.predicate(
    "inStock includes product1",
    resultInStock.data.some((p) => p.id === product1.id),
  );
  TestValidator.predicate(
    "inStock includes product2",
    resultInStock.data.some((p) => p.id === product2.id),
  );
  TestValidator.predicate(
    "inStock excludes product3",
    !resultInStock.data.some((p) => p.id === product3.id),
  );
  // 7. Search with price range filter and stock filter
  const searchPriceRangeBody = {
    minPrice: 20,
    maxPrice: 75,
    inStockOnly: true,
    limit: 100,
  } satisfies IEcommercePlatformProduct.ISearch;
  const resultPriceRange =
    await api.functional.ecommercePlatform.customer.search(customerConnection, {
      body: searchPriceRangeBody,
    });
  typia.assert(resultPriceRange);
  TestValidator.predicate(
    "priceRange includes product2 ($50 in range $20-$75)",
    resultPriceRange.data.some((p) => p.id === product2.id),
  );
  TestValidator.predicate(
    "priceRange excludes product1 ($10 below range)",
    !resultPriceRange.data.some((p) => p.id === product1.id),
  );
  TestValidator.predicate(
    "priceRange excludes product3 ($100 above range)",
    !resultPriceRange.data.some((p) => p.id === product3.id),
  );
  // 8. Search with sortBy=priceAsc - ascending price order
  const searchAscBody = {
    sortBy: "priceAsc",
    limit: 100,
  } satisfies IEcommercePlatformProduct.ISearch;
  const resultAsc = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: searchAscBody,
    },
  );
  typia.assert(resultAsc);
  TestValidator.predicate(
    "priceAsc: first price <= second price",
    resultAsc.data.length < 2 ||
      resultAsc.data[0].basePrice <= resultAsc.data[1].basePrice,
  );
  // 9. Search with sortBy=priceDesc - descending price order
  const searchDescBody = {
    sortBy: "priceDesc",
    limit: 100,
  } satisfies IEcommercePlatformProduct.ISearch;
  const resultDesc = await api.functional.ecommercePlatform.customer.search(
    customerConnection,
    {
      body: searchDescBody,
    },
  );
  typia.assert(resultDesc);
  TestValidator.predicate(
    "priceDesc: first price >= second price",
    resultDesc.data.length < 2 ||
      resultDesc.data[0].basePrice >= resultDesc.data[1].basePrice,
  );
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    resultInStock.pagination.current > 0,
  );
  TestValidator.equals(
    "pagination limit matches request",
    resultInStock.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records equals data length",
    resultInStock.pagination.records,
    resultInStock.data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    resultInStock.pagination.pages >= 1,
  );
  // 11. Verify nullable fields: no images created → null thumbnailUri, no reviews created → null averageRating
  for (const product of resultInStock.data) {
    TestValidator.equals(
      "no images: thumbnailUri is null",
      product.thumbnailUri,
      null,
    );
    TestValidator.equals(
      "no reviews: averageRating is null",
      product.averageRating,
      null,
    );
  }
}
