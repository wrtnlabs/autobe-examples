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
 * Test inventory record filtering by date range as an administrator.
 *
 * Validates that an administrator can filter inventory records using `from` and `to` date-time boundaries on the record's creation timestamp. The test creates a complete setup chain: admin registration, category creation, seller registration and approval, product creation, and finally a variant with initial stock that generates an inventory record.
 *
 * Time boundaries are captured immediately before and after variant creation to establish a precise date range window. The inventory listing is then queried with these boundaries.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and is approved by the administrator.
 * 3. Seller creates a product under the approved category.
 * 4. Time boundary `beforeVariantTime` is captured, then a variant with initial stock is created, followed by `afterVariantTime`.
 * 5. Administrator lists inventory records with `from: beforeVariantTime` and `to: afterVariantTime`.
 * 6. Validates that exactly one inventory record appears, pagination metadata reflects the filtered count, the record's `quantity_change` matches the initial stock, and the record's `created_at` falls within the inclusive date range.
 */
export async function test_api_inventory_record_admin_list_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Administrator approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  // 6. Create variant with initial stock — capture time boundaries
  const initialStock = 100;
  const beforeVariantTime = new Date().toISOString();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: initialStock },
      },
    );
  const afterVariantTime = new Date().toISOString();
  // 7. Administrator lists inventory records with date range filter
  const page =
    await api.functional.shoppingMall.admin.products.variants.inventory_records.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          from: beforeVariantTime,
          to: afterVariantTime,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page);
  // 8. Validate filtered results
  TestValidator.equals("filtered record count", page.data.length, 1);
  TestValidator.equals("pagination total records", page.pagination.records, 1);
  const record = page.data[0];
  TestValidator.equals(
    "variant reference matches",
    record.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "quantity change equals initial stock",
    record.quantity_change,
    initialStock,
  );
  TestValidator.predicate("reason is non-empty", record.reason.length > 0);
  TestValidator.predicate(
    "created_at within date range [from, to]",
    record.created_at >= beforeVariantTime &&
      record.created_at <= afterVariantTime,
  );
}
