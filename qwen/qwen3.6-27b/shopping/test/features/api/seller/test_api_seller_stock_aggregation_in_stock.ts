import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformStockAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformStockAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformStockAnalytic";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test seller stock analytics query to verify correct stock aggregation for in-stock variants.
 *
 * Validates the complete workflow of creating inventory data and querying stock analytics through the PATCH endpoint. Creates a product with a variant and posts an inventory restock, then verifies the aggregated stock quantity computation reflects the inventory ledger accurately.
 *
 * Special attention is paid to verifying that the aggregated currentStock matches the inventory record's quantity_delta, the availabilityStatus is correctly computed as 'in_stock' for positive stock, and joined data including product name, shop name, category name, and SKU code are properly returned.
 *
 * 1. Administrator joins and creates a product category for product assignment.
 * 2. Seller registers with email credentials and session context (pending approval).
 * 3. Administrator approves the seller registration request to enable product creation.
 * 4. Seller creates a product with base price and category assignment.
 * 5. Seller creates a product variant with SKU code and option attributes.
 * 6. Seller posts an inventory restock of +20 units to the variant.
 * 7. Seller queries stock analytics with filter parameters.
 * 8. Validates response contains correct aggregated stock data and joined information.
 */
export async function test_api_seller_stock_aggregation_in_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail },
  });
  // 2. Administrator creates a product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller joins (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: "password123" },
  });
  // 4. Admin approves seller registration
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
      } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );
  // 5. Seller creates a product with category assignment
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          base_price: 10000,
        },
      },
    );
  typia.assert(product);
  // 6. Seller creates a product variant with SKU and options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 7. Seller adds inventory restock (+20 units)
  const inventoryRecord =
    await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: { quantity_delta: 20, reason: "Initial restock" },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Seller queries stock analytics filtered by SKU code
  const stockRequest: IEcommercePlatformStockAnalytic.IRequest = {
    sku_code: variant.sku_code,
  };
  const stockResponse =
    await api.functional.ecommercePlatform.seller.analytics.stock.index(
      sellerConnection,
      {
        body: stockRequest,
      },
    );
  typia.assert(stockResponse);
  // 9. Validate response contains the variant with correct stock aggregation
  TestValidator.predicate("stock data returned", stockResponse.data.length > 0);
  const matched = stockResponse.data.find(
    (item) =>
      item.variantId === variant.id && item.skuCode === variant.sku_code,
  );
  TestValidator.predicate(
    "in-stock variant found in results",
    matched !== undefined,
  );
  TestValidator.equals(
    "currentStock matches restock amount",
    matched!.currentStock,
    20,
  );
  TestValidator.equals(
    "availabilityStatus is in_stock",
    matched!.availabilityStatus,
    "in_stock",
  );
  TestValidator.predicate(
    "product name present",
    matched!.productName.length > 0,
  );
  TestValidator.predicate("shop name present", matched!.shopName.length > 0);
  TestValidator.predicate(
    "category name present",
    matched!.categoryName.length > 0,
  );
  // 10. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    stockResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    stockResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records at least equals data length",
    stockResponse.pagination.records >= stockResponse.data.length,
  );
}
