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
 * Test default pagination of inventory record listing for a product variant.
 *
 * Validates the append-only inventory ledger listing endpoint by creating two
 * inventory records — one positive restock from variant creation and one
 * negative manual adjustment — then listing them with default pagination
 * parameters. Ensures the pagination metadata reflects correct defaults and
 * that records are ordered with the most recent change first.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product under the category, and adds a
 *    variant with initial stock quantity of 100, generating the first
 *    positive inventory record.
 * 3. Seller creates a manual inventory adjustment with negative quantity
 *    of -30, adding a deduction record to the ledger.
 * 4. Seller lists inventory records without any filters to exercise
 *    default pagination behavior.
 * 5. Validates pagination metadata: current page is 1, limit defaults to
 *    20, total records is 2, and total pages is 1.
 * 6. Validates records are ordered newest first with the manual deduction
 *    appearing before the initial restock.
 * 7. Validates each record has the required fields: id (UUID),
 *    quantity_change (signed integer), reason, created_at timestamp, and
 *    shopping_mall_product_variant_id matching the target variant.
 * 8. Validates the sum of all quantity_change values across the returned
 *    records equals the expected net stock of 70.
 */
export async function test_api_inventory_record_listing_default_pagination(
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
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 3. Create variant with initial stock (generates first positive record)
  const initialStock = 100;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: initialStock },
      },
    );
  typia.assert(variant);
  // 4. Create manual adjustment (negative quantity)
  const adjustmentQuantity = -30;
  const adjustment =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: adjustmentQuantity,
          reason: "Manual adjustment for testing",
        },
      },
    );
  typia.assert(adjustment);
  // 5. List inventory records with default pagination (no filters)
  const page =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(page);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", page.pagination.current, 1);
  TestValidator.equals("default limit", page.pagination.limit, 20);
  TestValidator.equals("total records", page.pagination.records, 2);
  TestValidator.equals("total pages", page.pagination.pages, 1);
  // 7. Validate records are ordered newest first
  TestValidator.equals("data length", page.data.length, 2);
  const [newest, oldest] = page.data;
  TestValidator.equals(
    "newest is adjustment",
    newest.quantity_change,
    adjustmentQuantity,
  );
  TestValidator.equals(
    "oldest is restock",
    oldest.quantity_change,
    initialStock,
  );
  // Verify variant ID references
  TestValidator.equals(
    "adjustment variant id",
    newest.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "restock variant id",
    oldest.shopping_mall_product_variant_id,
    variant.id,
  );
  // 8. Validate stock sum matches expected total
  const computedStock = page.data.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  TestValidator.equals(
    "computed stock matches expected",
    computedStock,
    initialStock + adjustmentQuantity,
  );
}