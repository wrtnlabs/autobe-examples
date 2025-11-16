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

export async function test_api_platform_admin_inventory_stock_levels_basic_statistics(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and get authorized context
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product under the seller and associated brand
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    10,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create two SKUs under that product
  const skuBodies: IShoppingMallProductSku.ICreate[] = [
    {
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(2),
      listPrice: 10000,
      salePrice: 9000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    },
    {
      code: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(2),
      listPrice: 20000,
      salePrice: 18000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    },
  ];

  const skus: IShoppingMallProductSku[] = [];
  for (const skuBody of skuBodies) {
    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuBody,
        },
      );
    typia.assert(sku);
    skus.push(sku);
  }

  // 6. Create inventory items for each SKU with known quantities/thresholds
  const inventoryInputs: IShoppingMallInventoryItem.ICreate[] = [
    {
      product_sku_id: skus[0].id,
      on_hand_quantity: 3 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      backorder_enabled: false,
      preorder_enabled: false,
    },
    {
      product_sku_id: skus[1].id,
      on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
      low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
      backorder_enabled: false,
      preorder_enabled: false,
    },
  ];

  const inventoryItems: IShoppingMallInventoryItem[] = [];
  for (const body of inventoryInputs) {
    const item: IShoppingMallInventoryItem =
      await api.functional.shoppingMall.seller.inventoryItems.create(
        connection,
        {
          body,
        },
      );
    typia.assert(item);
    inventoryItems.push(item);
  }

  const expectedTotalOnHand =
    inventoryInputs[0].on_hand_quantity + inventoryInputs[1].on_hand_quantity;
  const expectedTotalReserved = 0;
  const expectedTotalAvailable = expectedTotalOnHand - expectedTotalReserved;
  const expectedSkuCount = inventoryInputs.length;
  const expectedLowStockSkuCount = 1;
  const expectedOutOfStockSkuCount = 0;

  // 7. Re-authenticate as platform admin to ensure admin context
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession);

  // 8. Call stock level statistics as platform admin
  const stats: IShoppingMallInventoryStockStatistics =
    await api.functional.shoppingMall.platformAdmin.inventory.statistics.stockLevels.index(
      connection,
    );
  typia.assert(stats);

  // 9. Validate aggregated statistics against expectations
  TestValidator.equals(
    "total_on_hand_units matches sum of on_hand_quantity",
    stats.total_on_hand_units,
    expectedTotalOnHand,
  );

  TestValidator.equals(
    "total_reserved_units is zero when no reservations exist",
    stats.total_reserved_units,
    expectedTotalReserved,
  );

  TestValidator.equals(
    "total_available_units equals on_hand minus reserved",
    stats.total_available_units,
    expectedTotalAvailable,
  );

  TestValidator.equals(
    "sku_count equals number of SKUs with inventory items",
    stats.sku_count,
    expectedSkuCount,
  );

  TestValidator.equals(
    "low_stock_sku_count equals SKUs below or equal to low_stock_threshold",
    stats.low_stock_sku_count,
    expectedLowStockSkuCount,
  );

  TestValidator.equals(
    "out_of_stock_sku_count is zero when no SKU has zero available units",
    stats.out_of_stock_sku_count,
    expectedOutOfStockSkuCount,
  );
}
