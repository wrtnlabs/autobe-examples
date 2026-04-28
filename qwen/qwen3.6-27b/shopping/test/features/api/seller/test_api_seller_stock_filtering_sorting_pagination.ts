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
 * Test multi-filter combination, sorting, and pagination for stock analytics.
 *
 * Validates the stock analytics query with SKU partial matching, minimum stock level filtering, descending sort by stock quantity, and pagination. Sets up three product variants sharing the SKU prefix 'SKT-001' with varying stock levels (100, 50, and 5 units).
 *
 * The query filters by sku_code='SKT-001' (partial match includes all three variants), min_stock_level=10 (filters out the variant with 5 units), sort_by='current_stock', sort_order='desc', page_size=2. Validates that only 2 items remain (stocks 100 and 50), sorted by current_stock descending, pagination metadata shows limit=2, current=1, records=2, pages=1, and all response fields including shop_name and category_name are correctly joined.
 *
 * 1. Admin registers and logs in.
 * 2. Admin creates a product category.
 * 3. Seller registers and logs in.
 * 4. Seller creates a product.
 * 5. Seller creates three variants with SKU codes SKT-001-RED, SKT-001-BLUE, SKT-001-GRAY.
 * 6. Restocks each variant with 100, 50, and 5 units respectively.
 * 7. Seller queries stock analytics with SKU partial match, min stock level 10, descending sort.
 * 8. Validates filtering results contain exactly 2 items sorted by stock descending and pagination metadata is correct.
 */
export async function test_api_seller_stock_filtering_sorting_pagination(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://admin.test.com",
      referrer: "https://admin.test.com/login",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Create category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies DeepPartial<IEcommercePlatformCategory.ICreate>,
      },
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://seller.test.com",
      referrer: "https://seller.test.com/login",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 4. Create product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: "Test Product",
          description: "A test product for stock analytics",
          base_price: 1000,
          category_id: category.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 5. Create variant SKT-001-RED (100 units)
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "SKT-001-RED",
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        } satisfies DeepPartial<IEcommercePlatformProductVariant.ICreate>,
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // Create variant SKT-001-BLUE (50 units)
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "SKT-001-BLUE",
          options: [
            {
              attributeKey: "color",
              attributeValue: "Blue",
            },
          ],
        } satisfies DeepPartial<IEcommercePlatformProductVariant.ICreate>,
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // Create variant SKT-001-GRAY (5 units)
  const variant3 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "SKT-001-GRAY",
          options: [
            {
              attributeKey: "color",
              attributeValue: "Gray",
            },
          ],
        } satisfies DeepPartial<IEcommercePlatformProductVariant.ICreate>,
        params: { productId: product.id },
      },
    );
  typia.assert(variant3);
  // 6. Restock variants
  await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_delta: 100,
        reason: "Initial restock for SKT-001-RED",
      } satisfies DeepPartial<IEcommercePlatformInventoryRecord.ICreate>,
      params: { productId: product.id, variantId: variant1.id },
    },
  );
  await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_delta: 50,
        reason: "Initial restock for SKT-001-BLUE",
      } satisfies DeepPartial<IEcommercePlatformInventoryRecord.ICreate>,
      params: { productId: product.id, variantId: variant2.id },
    },
  );
  await generate_random_ecommerce_platform_seller_products_variants_inventory_create(
    sellerConnection,
    {
      body: {
        quantity_delta: 5,
        reason: "Initial restock for SKT-001-GRAY",
      } satisfies DeepPartial<IEcommercePlatformInventoryRecord.ICreate>,
      params: { productId: product.id, variantId: variant3.id },
    },
  );
  // 7. Query stock analytics
  const stockQuery: IEcommercePlatformStockAnalytic.IRequest = {
    sku_code: "SKT-001",
    min_stock_level: 10,
    sort_by: "current_stock",
    sort_order: "desc",
    page_size: 2,
  } satisfies IEcommercePlatformStockAnalytic.IRequest;
  const result =
    await api.functional.ecommercePlatform.seller.analytics.stock.index(
      sellerConnection,
      {
        body: stockQuery,
      },
    );
  typia.assert(result);
  // 8. Validate results
  TestValidator.equals("filtered item count", result.data.length, 2);
  TestValidator.equals("pagination limit", result.pagination.limit, 2);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals(
    "pagination total records",
    result.pagination.records,
    2,
  );
  TestValidator.equals("pagination total pages", result.pagination.pages, 1);
  // Validate sorting - highest stock first
  TestValidator.equals("first item stock", result.data[0].currentStock, 100);
  TestValidator.equals("second item stock", result.data[1].currentStock, 50);
  // Validate SKU codes - should start with 'SKT-001' but exclude -GRAY (filtered by min_stock_level)
  TestValidator.predicate(
    "first SKU starts with prefix",
    result.data[0].skuCode.startsWith("SKT-001"),
  );
  TestValidator.predicate(
    "second SKU starts with prefix",
    result.data[1].skuCode.startsWith("SKT-001"),
  );
  // Validate that SKU with 5 units (SKT-001-GRAY) is excluded by min_stock_level=10 filter
  for (const item of result.data) {
    TestValidator.predicate(
      "current stock above minimum threshold",
      item.currentStock >= 10,
    );
  }
  // Validate response fields
  TestValidator.predicate(
    "first item has shop_name",
    result.data[0].shopName != null && result.data[0].shopName.length > 0,
  );
  TestValidator.predicate(
    "first item has category_name",
    result.data[0].categoryName != null &&
      result.data[0].categoryName.length > 0,
  );
  TestValidator.predicate(
    "first item has product_name",
    result.data[0].productName != null && result.data[0].productName.length > 0,
  );
  TestValidator.predicate(
    "second item has shop_name",
    result.data[1].shopName != null && result.data[1].shopName.length > 0,
  );
  TestValidator.predicate(
    "second item has product_name",
    result.data[1].productBasePrice > 0,
  );
}
