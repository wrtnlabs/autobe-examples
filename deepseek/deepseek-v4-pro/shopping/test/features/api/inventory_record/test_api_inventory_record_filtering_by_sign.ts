import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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
 * Validate the sign-based filtering capability of the inventory ledger listing.
 *
 * Tests that the seller can filter inventory records by the direction of quantity changes — positive for restocks and negative for deductions. This is a critical inventory management workflow that enables sellers to audit stock increases separately from decreases, supporting accurate inventory reconciliation.
 *
 * The test creates two inventory records for the same variant: one positive (initial stock during variant creation) and one negative (manual deduction). It then queries the listing endpoint with three different sign filter configurations to verify each behaves correctly.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under that category, and adds a variant with 10 units of initial stock, generating a positive inventory record.
 * 3. Seller creates a manual deduction of -3 units, generating a negative inventory record.
 * 4. Lists records with sign="positive" and verifies only the restock record appears.
 * 5. Lists records with sign="negative" and verifies only the deduction record appears.
 * 6. Lists records without sign filter and verifies both records are returned.
 */
export async function test_api_inventory_record_filtering_by_sign(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup, product creation, and variant with initial stock
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 3. Create manual deduction (negative inventory record)
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: -3,
        reason: "Manual deduction for sign filtering validation",
      },
    },
  );
  // 4. List with sign='positive' — only the initial restock
  const positiveResult =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sign: "positive",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(positiveResult);
  TestValidator.predicate(
    "positive sign filter returns only records with quantity_change > 0",
    positiveResult.data.every((r) => r.quantity_change > 0),
  );
  TestValidator.equals(
    "positive sign filter returns exactly 1 record (the initial restock)",
    positiveResult.data.length,
    1,
  );
  // 5. List with sign='negative' — only the manual deduction
  const negativeResult =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sign: "negative",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(negativeResult);
  TestValidator.predicate(
    "negative sign filter returns only records with quantity_change < 0",
    negativeResult.data.every((r) => r.quantity_change < 0),
  );
  TestValidator.equals(
    "negative sign filter returns exactly 1 record (the manual deduction)",
    negativeResult.data.length,
    1,
  );
  // 6. List without sign filter — both records returned
  const allResult =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "no sign filter returns both inventory records",
    allResult.data.length,
    2,
  );
}
