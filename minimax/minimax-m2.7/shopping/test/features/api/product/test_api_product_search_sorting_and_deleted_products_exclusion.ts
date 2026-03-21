import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_search_sorting_and_deleted_products_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // Test product search with different sorting options and verify deleted products are excluded.
  // 1. Admin creates category for products
  // 2. Seller registers, creates multiple products with different prices
  // 3. Search sorted by price_asc and verify ascending order
  // 4. Search sorted by price_desc and verify descending order
  // 5. Search sorted by newest and verify created_at descending
  // 6. Delete one product and verify it does not appear in search results
  // 7. Verify deleted products are excluded even without any filters
  // 1. Admin setup - create admin account and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and create products
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Create products with different prices for sorting tests
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: "Low Price Product",
        base_price:
          (typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() %
            100) +
          10,
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: "Medium Price Product",
        base_price:
          (typia.random<number & tags.Type<"int32"> & tags.Minimum<50>>() %
            100) +
          50,
      },
    },
  );
  typia.assert(product2);
  const product3 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: "High Price Product",
        base_price:
          (typia.random<number & tags.Type<"int32"> & tags.Minimum<100>>() %
            100) +
          100,
      },
    },
  );
  typia.assert(product3);
  // Create variants for all products (required for search to return them)
  await generate_random_ecommerce_mall_seller_seller_products_variants_create(
    sellerConnection,
    {
      params: { productId: product1.id },
    },
  );
  await generate_random_ecommerce_mall_seller_seller_products_variants_create(
    sellerConnection,
    {
      params: { productId: product2.id },
    },
  );
  await generate_random_ecommerce_mall_seller_seller_products_variants_create(
    sellerConnection,
    {
      params: { productId: product3.id },
    },
  );
  // 3. Sort by price_low_to_high (price_asc) and verify ascending order
  const searchAscResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "price_asc",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchAscResult);
  for (let i = 1; i < searchAscResult.data.length; i++) {
    TestValidator.predicate(
      "price ascending order",
      searchAscResult.data[i].min_price >=
        searchAscResult.data[i - 1].min_price,
    );
  }
  // 4. Sort by price_high_to_low (price_desc) and verify descending order
  const searchDescResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "price_desc",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchDescResult);
  for (let i = 1; i < searchDescResult.data.length; i++) {
    TestValidator.predicate(
      "price descending order",
      searchDescResult.data[i].max_price <=
        searchDescResult.data[i - 1].max_price,
    );
  }
  // 5. Sort by newest and verify created_at descending
  const searchNewestResult = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {
        sort: "newest",
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchNewestResult);
  for (let i = 1; i < searchNewestResult.data.length; i++) {
    const prev = new Date(searchNewestResult.data[i - 1].created_at).getTime();
    const curr = new Date(searchNewestResult.data[i].created_at).getTime();
    TestValidator.predicate(
      "newest order (created_at descending)",
      curr <= prev,
    );
  }
  // 6. Delete product2 and verify it does not appear in search results
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product2.id,
  });
  const searchAfterDelete = await api.functional.ecommerceMall.products.search(
    connection,
    {
      body: {} satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(searchAfterDelete);
  // Verify deleted product is not in results
  const deletedProductFound = searchAfterDelete.data.some(
    (p) => p.id === product2.id,
  );
  TestValidator.equals(
    "deleted product excluded from search",
    deletedProductFound,
    false,
  );
  // 7. Verify only active products (deleted_at IS NULL) are returned
  // The remaining products should be product1 and product3
  const productIds = searchAfterDelete.data.map((p) => p.id);
  TestValidator.equals(
    "active products count correct",
    searchAfterDelete.data.length,
    2,
  );
  TestValidator.equals(
    "product1 still visible",
    productIds.includes(product1.id),
    true,
  );
  TestValidator.equals(
    "product3 still visible",
    productIds.includes(product3.id),
    true,
  );
  TestValidator.equals(
    "product2 (deleted) not visible",
    productIds.includes(product2.id),
    false,
  );
}
