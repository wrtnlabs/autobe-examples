import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallInventoryLowStockStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLowStockStatistics";
import type { IShoppingMallInventoryLowStockStatisticsItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLowStockStatisticsItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_low_stock_statistics_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin via join
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "Admin!234";

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoinOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoinOutput);

  // 2. Register and authenticate seller via join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "Seller!234";

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // 3. Switch back to platform admin for brand creation
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginOutput);

  // 4. Create a brand as platform admin
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 5. Switch to seller for seller-owned product and related entities
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 6. Seller creates a product associated with self and the created brand
  const sellerProductCode = `SKU-PROD-${RandomGenerator.alphaNumeric(6)}`;
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerJoinOutput.seller.id,
    shopping_mall_brand_id: brand.id,
    code: sellerProductCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as
      | (string & tags.Format<"uri">)
      | null
      | undefined,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  TestValidator.equals(
    "seller product code should match",
    sellerProduct.code,
    sellerProductCode,
  );

  // 7. Seller defines a product option type
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: sellerProduct.code,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 8. Seller defines an option value for the option type
  const optionValueCreateBody = {
    value: "L",
    display_name: "Large",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: sellerProduct.code,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // 9. Seller creates a SKU under the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Size L Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: sellerProduct.code,
      body: skuCreateBody,
    });
  typia.assert(sellerSku);

  TestValidator.equals("sku code should match", sellerSku.code, skuCode);

  // 10. Seller creates an inventory item for the SKU with low-stock threshold
  const onHandQuantity = 3 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const lowStockThreshold = 5 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryCreateBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: onHandQuantity,
    low_stock_threshold: lowStockThreshold,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  TestValidator.equals(
    "inventory sku id should match",
    inventoryItem.product_sku_id,
    sellerSku.id,
  );

  // 11. Switch back to platform admin to fetch low-stock statistics
  const platformAdminLoginAgainBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAgainOutput: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginAgainBody,
    });
  typia.assert(platformAdminLoginAgainOutput);

  // 12. Retrieve low-stock statistics as platform admin
  const stats: IShoppingMallInventoryLowStockStatistics =
    await api.functional.shoppingMall.platformAdmin.inventory.statistics.lowStock.index(
      connection,
    );
  typia.assert(stats);

  // Basic shape validations
  await TestValidator.predicate(
    "statistics should have non-empty generated_at",
    async () => stats.generated_at.length > 0,
  );

  // Ensure at least one item exists in statistics (system-dependent, but we
  // expect our created inventory to be included because it is low-stock)
  await TestValidator.predicate(
    "statistics should contain at least one item",
    async () => stats.items.length >= 1,
  );

  // Find our SKU in the statistics items
  const matched: IShoppingMallInventoryLowStockStatisticsItem | undefined =
    stats.items.find((item) => item.sku_id === sellerSku.id);

  await TestValidator.predicate(
    "low-stock statistics should contain created sku",
    async () => matched !== undefined,
  );

  if (!matched) return; // Type narrowing for TypeScript safety

  // Validate core identity fields
  TestValidator.equals(
    "matched sku_id should equal created sku id",
    matched.sku_id,
    sellerSku.id,
  );
  TestValidator.equals(
    "matched sku_code should equal created sku code",
    matched.sku_code,
    sellerSku.code,
  );
  TestValidator.equals(
    "matched product_id should equal created product id",
    matched.product_id,
    sellerProduct.id,
  );
  TestValidator.equals(
    "matched product_name should equal created product name",
    matched.product_name,
    sellerProduct.name,
  );

  // Quantitative checks: available_quantity should not be negative
  await TestValidator.predicate(
    "available_quantity should be non-negative",
    async () => matched.available_quantity >= 0,
  );

  // If low_stock_threshold is present on inventory, expect equality in stats
  if (
    inventoryItem.low_stock_threshold !== null &&
    inventoryItem.low_stock_threshold !== undefined
  ) {
    TestValidator.equals(
      "low_stock_threshold in stats should match inventory configuration",
      matched.low_stock_threshold,
      inventoryItem.low_stock_threshold,
    );
  }

  // is_low_stock should be true for a SKU where available_quantity is less than or equal to threshold
  await TestValidator.predicate(
    "is_low_stock flag should be consistent with threshold",
    async () =>
      matched.is_low_stock ===
      matched.available_quantity <= matched.low_stock_threshold,
  );

  // Check that there are no duplicate entries for the same sku_id
  const duplicates = stats.items.filter((item) => item.sku_id === sellerSku.id);
  await TestValidator.predicate(
    "statistics should not contain duplicate entries for same sku",
    async () => duplicates.length === 1,
  );
}
