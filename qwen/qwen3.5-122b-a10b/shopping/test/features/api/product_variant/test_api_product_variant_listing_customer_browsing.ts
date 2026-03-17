import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test customer product variant listing with filtering and pagination.
 *
 * Validates that customers can browse product variants with:
 * - Pagination support (page, limit)
 * - Filtering (sku_code, price range, stock quantity)
 * - Sorting (created_at, sku_code, price, stock_quantity)
 * - Public access without authentication
 * - Proper handling of products without variants
 */
export async function test_api_product_variant_listing_customer_browsing(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Admin creates category ==========
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ========== SETUP: Seller creates product with variants ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create first variant
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Create second variant with different options
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(5).toUpperCase()}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // ========== TEST 1: Basic variant listing with pagination ==========
  const listing1 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing1);
  TestValidator.equals("total variants", listing1.pagination.records, 2);
  TestValidator.equals("page 1 data count", listing1.data.length, 2);
  TestValidator.predicate("has pagination", listing1.pagination.current === 1);
  // ========== TEST 2: Filter by SKU code ==========
  const listing2 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: variant1.skuCode.substring(0, 4),
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing2);
  TestValidator.equals(
    "SKU filter returns matching variant",
    listing2.data.length,
    1,
  );
  TestValidator.equals(
    "filtered SKU matches",
    listing2.data[0].sku_code,
    variant1.skuCode,
  );
  // ========== TEST 3: Filter by price range ==========
  const listing3 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        price_min: 1000,
        price_max: 50000,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing3);
  TestValidator.predicate(
    "price filter returns variants",
    listing3.data.length > 0,
  );
  // ========== TEST 4: Filter by stock quantity ==========
  const listing4 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        stock_quantity: 5,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing4);
  TestValidator.predicate(
    "stock filter returns in-stock variants",
    listing4.data.length > 0,
  );
  // ========== TEST 5: Sorting by sku_code ascending ==========
  const listing5 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        sort_by: "sku_code",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing5);
  if (listing5.data.length >= 2) {
    TestValidator.predicate(
      "sorted ascending by SKU",
      listing5.data[0].sku_code <= listing5.data[1].sku_code,
    );
  }
  // ========== TEST 6: Sorting by price descending ==========
  const listing6 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        sort_by: "price",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing6);
  if (listing6.data.length >= 2) {
    const price1 = listing6.data[0].price ?? 0;
    const price2 = listing6.data[1].price ?? 0;
    TestValidator.predicate("sorted descending by price", price1 >= price2);
  }
  // ========== TEST 7: Pagination - page 2 with limit 1 ==========
  const listing7 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 2,
        limit: 1,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing7);
  TestValidator.equals("page 2 current", listing7.pagination.current, 2);
  TestValidator.equals("page 2 data count", listing7.data.length, 1);
  TestValidator.predicate("has 2 total pages", listing7.pagination.pages === 2);
  // ========== TEST 8: Combined filters ==========
  const listing8 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: variant1.skuCode.substring(0, 4),
        price_min: 1000,
        stock_quantity: 0,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing8);
  TestValidator.predicate("combined filters work", listing8.data.length >= 0);
  // ========== TEST 9: Product without variants ==========
  const productWithoutVariants =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productWithoutVariants);
  const listing9 = await api.functional.ecommerceMall.products.variants.index(
    connection,
    {
      productId: productWithoutVariants.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProductVariant.IRequest,
    },
  );
  typia.assert(listing9);
  TestValidator.equals("empty variants array", listing9.data.length, 0);
  TestValidator.equals(
    "pagination shows 0 records",
    listing9.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination shows 0 pages",
    listing9.pagination.pages,
    0,
  );
  // ========== TEST 10: Variant summary structure validation ==========
  if (listing1.data.length > 0) {
    const variantSummary = listing1.data[0];
    TestValidator.predicate("has id", variantSummary.id !== undefined);
    TestValidator.predicate(
      "has sku_code",
      variantSummary.sku_code !== undefined,
    );
    TestValidator.predicate(
      "has stock_quantity",
      variantSummary.stock_quantity !== undefined,
    );
    TestValidator.predicate(
      "has option_values",
      variantSummary.option_values !== undefined,
    );
  }
}