import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryStockStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStockStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that platform admin inventory stock level statistics correctly reflect
 * low-stock and out-of-stock SKU counts based on underlying inventory items.
 *
 * Business flow:
 *
 * 1. A platform admin joins the system.
 * 2. The platform admin creates a brand.
 * 3. A seller joins the system.
 * 4. The seller creates a product associated with the brand.
 * 5. The seller creates three SKUs under that product.
 * 6. The seller creates one inventory item per SKU with distinct
 *    quantity/threshold patterns so that one SKU is clearly in healthy stock,
 *    one is low-ish, and one is out of stock.
 * 7. The platform admin logs in again and requests aggregated stock-level
 *    statistics.
 * 8. The test asserts that the statistics reflect at least one out-of-stock SKU,
 *    that low-stock SKU count is not less than out-of-stock count, that SKU
 *    counts and unit totals are consistent with the created items, and that
 *    aggregate totals are non-negative and reasonable.
 */
export async function test_api_platform_admin_inventory_stock_levels_low_and_out_of_stock_counts(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/brand-logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a product associated with the brand
  const productCode: string & tags.MinLength<1> =
    `PROD-${RandomGenerator.alphaNumeric(10)}` satisfies string as string &
      tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Product ${RandomGenerator.name(1)}`,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller creates three SKUs under the product
  const skuHealthyBody = {
    code: `SKU-H-${RandomGenerator.alphaNumeric(6)}`,
    name: `Healthy ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuLowishBody = {
    code: `SKU-L-${RandomGenerator.alphaNumeric(6)}`,
    name: `Lowish ${RandomGenerator.name(1)}`,
    listPrice: 8000,
    salePrice: 7500,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuOutBody = {
    code: `SKU-O-${RandomGenerator.alphaNumeric(6)}`,
    name: `Out ${RandomGenerator.name(1)}`,
    listPrice: 7000,
    salePrice: 6500,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const skuHealthy: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuHealthyBody,
    });
  typia.assert(skuHealthy);

  const skuLowish: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuLowishBody,
    });
  typia.assert(skuLowish);

  const skuOut: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuOutBody,
    });
  typia.assert(skuOut);

  // 6. Create inventory items for each SKU with tailored stock patterns
  const healthyOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    50 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const lowishOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    2 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const outOnHand: number & tags.Type<"int32"> & tags.Minimum<0> = 0 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const healthyInventoryBody = {
    product_sku_id: skuHealthy.id,
    on_hand_quantity: healthyOnHand,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const lowishInventoryBody = {
    product_sku_id: skuLowish.id,
    on_hand_quantity: lowishOnHand,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const outInventoryBody = {
    product_sku_id: skuOut.id,
    on_hand_quantity: outOnHand,
    low_stock_threshold: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const healthyInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: healthyInventoryBody,
    });
  typia.assert(healthyInventory);

  const lowishInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: lowishInventoryBody,
    });
  typia.assert(lowishInventory);

  const outInventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: outInventoryBody,
    });
  typia.assert(outInventory);

  // 7. Switch back to platform admin context via login
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 8. Retrieve aggregated stock level statistics
  const stats: IShoppingMallInventoryStockStatistics =
    await api.functional.shoppingMall.platformAdmin.inventory.statistics.stockLevels.index(
      connection,
    );
  typia.assert(stats);

  // 9. Logical assertions on statistics
  const createdSkuCount = 3;
  const createdOnHandTotal = healthyOnHand + lowishOnHand + outOnHand;

  TestValidator.predicate(
    "sku_count should be at least number of SKUs with inventory items created in this test",
    stats.sku_count >= createdSkuCount,
  );

  TestValidator.predicate(
    "total_on_hand_units should be at least sum of on-hand quantities for created inventory items",
    stats.total_on_hand_units >= createdOnHandTotal,
  );

  TestValidator.predicate(
    "total_reserved_units should be non-negative",
    stats.total_reserved_units >= 0,
  );

  TestValidator.predicate(
    "total_available_units should be non-negative",
    stats.total_available_units >= 0,
  );

  TestValidator.predicate(
    "low_stock_sku_count should be greater than or equal to out_of_stock_sku_count",
    stats.low_stock_sku_count >= stats.out_of_stock_sku_count,
  );

  TestValidator.predicate(
    "out_of_stock_sku_count should be at least 1 due to explicitly out-of-stock SKU created in this test",
    stats.out_of_stock_sku_count >= 1,
  );
}
