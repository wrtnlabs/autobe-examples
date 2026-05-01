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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test administrator retrieval of paginated inventory records for a product variant.
 *
 * Validates the complete flow from seller registration through variant creation with initial stock, culminating in the administrator listing the variant's inventory ledger. The test ensures that the paginated inventory records endpoint returns correct pagination metadata, properly structured inventory records, and the auto-generated initial stock entry with a positive quantity change and descriptive reason.
 *
 * 1. Administrator authenticates via authorize_admin_join.
 * 2. Seller registers via authorize_seller_join (starts in "pending" status).
 * 3. Administrator approves the seller, granting product management privileges.
 * 4. Administrator creates a top-level category for product classification.
 * 5. Seller creates a product assigned to the category.
 * 6. Seller creates a variant with initial stock quantity of 100, which triggers automatic creation of a positive inventory record.
 * 7. Administrator lists the variant's inventory records with default pagination (page 1, limit 20).
 * 8. Validates pagination metadata: current page, limit, total records, and total pages.
 * 9. Validates the inventory record: positive quantity_change matching initial stock, non-empty reason, correct variant reference, and all required fields present via typia.assert.
 */
export async function test_api_inventory_record_admin_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Administrator creates a top-level category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  // 6. Seller creates a variant with initial stock (generates an inventory record)
  const initialStock = 100;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: initialStock },
      },
    );
  // 7. Administrator lists inventory records with default pagination
  const result =
    await api.functional.shoppingMall.admin.products.variants.inventory_records.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(result);
  // 8. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    1,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 1);
  // 9. Validate inventory record content
  TestValidator.predicate("has at least one record", result.data.length > 0);
  const record = result.data[0];
  TestValidator.equals(
    "record references correct variant",
    record.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.predicate(
    "quantity_change is positive",
    record.quantity_change > 0,
  );
  TestValidator.equals(
    "quantity_change matches initial stock",
    record.quantity_change,
    initialStock,
  );
  TestValidator.predicate(
    "reason is non-empty descriptive text",
    record.reason.length > 0,
  );
  // Validate records are ordered by created_at descending (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prev = result.data[i - 1];
    const curr = result.data[i];
    TestValidator.predicate(
      `records ordered by created_at descending at index ${i}`,
      prev.created_at >= curr.created_at,
    );
  }
}
