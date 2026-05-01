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
 * Test inventory record date range filtering for audit trail inspection.
 *
 * Validates that the inventory ledger's date range filter (`from` and `to` parameters on the PATCH listing endpoint) correctly includes and excludes records based on their `created_at` timestamps. This capability is essential for sellers auditing stock movements during specific periods such as monthly reconciliation windows or investigating inventory changes within a particular week.
 *
 * The test establishes two inventory records at distinct timestamps (T1 from variant creation with initial stock, T2 from a manual restock adjustment) and then queries the ledger with three filter configurations to confirm boundary-inclusive filtering behavior.
 *
 * 1. Admin registers and creates a top-level category.
 * 2. Seller registers, creates a product in the category, and creates a variant with 100 initial stock units — this auto-generates the first inventory record (T1).
 * 3. After a delay, seller creates a manual restock of 50 units — this generates the second inventory record (T2).
 * 4. Query with `from` between T1 and T2, no `to`: validates only the T2 record is returned (T1 excluded as it predates the `from` boundary).
 * 5. Query with `to` between T1 and T2, no `from`: validates only the T1 record is returned (T2 excluded as it postdates the `to` boundary).
 * 6. Query with `from` before T1 and `to` after T2: validates both records are returned when the range spans all records.
 */
export async function test_api_inventory_record_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  // 4. Capture timestamp before variant creation
  const beforeT1 = new Date().toISOString();
  // 5. Create variant with initial stock (auto-generates first inventory record at T1)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 100 },
      },
    );
  typia.assert(variant);
  // 6. Delay to ensure mid timestamp is strictly after T1
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 7. Capture mid timestamp (between T1 and T2)
  const midTimestamp = new Date().toISOString();
  // 8. Delay to ensure T2 is strictly after mid
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 9. Create manual inventory record (T2)
  const manualRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_change: 50, reason: "Manual restock adjustment" },
      },
    );
  typia.assert(manualRecord);
  // 10. Capture timestamp after T2
  const afterT2 = new Date().toISOString();
  // 11. Test 1: from=mid, no to → only T2 record (T1 excluded)
  const result1 =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: midTimestamp,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals("from-only: record count", result1.data.length, 1);
  TestValidator.equals(
    "from-only: record matches manual record id",
    result1.data[0].id,
    manualRecord.id,
  );
  // 12. Test 2: to=mid, no from → only T1 record (T2 excluded)
  const result2 =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          to: midTimestamp,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals("to-only: record count", result2.data.length, 1);
  TestValidator.predicate(
    "to-only: record is the initial stock record (not manual)",
    () => result2.data[0].id !== manualRecord.id,
  );
  // 13. Test 3: from=beforeT1, to=afterT2 → both records
  const result3 =
    await api.functional.shoppingMall.seller.products.variants.inventory_records.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: beforeT1,
          to: afterT2,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "full range: both records returned",
    result3.data.length,
    2,
  );
}
