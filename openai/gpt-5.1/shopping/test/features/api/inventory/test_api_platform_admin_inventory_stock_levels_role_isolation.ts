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
 * Validate platform-level inventory stock statistics aggregation across
 * multiple sellers.
 *
 * Business goals:
 *
 * - Ensure that inventory statistics returned to a platform admin aggregate stock
 *   across all sellers rather than being scoped to a single seller.
 * - Confirm that per-seller inventory creation flows (product -> sku -> inventory
 *   item) require seller authentication, while only platform admins can call
 *   the stock-level statistics endpoint.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join.
 * 2. As the platform admin, create a shared brand using
 *    /shoppingMall/platformAdmin/brands.
 * 3. Join as seller A via /auth/seller/join; then optionally login to verify login
 *    flow.
 * 4. Under seller A context, create a product, then a SKU, then an inventory item
 *    with on_hand_quantity=5 and reserved_quantity implicitly 0.
 * 5. Join as seller B and repeat: create product, SKU, and inventory item with
 *    on_hand_quantity=7.
 * 6. Switch context back to the platform admin (login again if necessary).
 * 7. Call GET /shoppingMall/platformAdmin/inventory/statistics/stockLevels.
 * 8. Validate that:
 *
 *    - Total_on_hand_units === 12 (5 from seller A + 7 from seller B).
 *    - Total_reserved_units === 0.
 *    - Total_available_units === 12.
 *    - Sku_count >= 2 (at least the two SKUs we created contribute).
 */
export async function test_api_platform_admin_inventory_stock_levels_role_isolation(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create shared brand as platform admin
  const brandSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Helper to create seller, product, sku, and inventory item with a given on-hand quantity
  const createSellerWithInventory = async (
    storeNamePrefix: string,
    onHandQuantity: number & tags.Type<"int32"> & tags.Minimum<0>,
  ) => {
    // Join seller
    const sellerEmail: string = typia.random<string & tags.Format<"email">>();
    const sellerJoinBody = {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
      storeName: `${storeNamePrefix}-${RandomGenerator.alphabets(6)}`,
      contactPhone: RandomGenerator.mobile(),
    } satisfies IShoppingMallSellerJoin.IRequest;

    const seller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.join(connection, {
        body: sellerJoinBody,
      });
    typia.assert(seller);

    // (Optional) explicit login to simulate real flow
    const sellerLoginBody = {
      email: sellerEmail,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/",
    } satisfies IShoppingMallSellerLogin.IRequest;

    const sellerLogin: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, {
        body: sellerLoginBody,
      });
    typia.assert(sellerLogin);

    // Create product under this seller
    const productCode = `P-${RandomGenerator.alphaNumeric(10)}`;
    const productCreateBody = {
      shopping_mall_seller_id: seller.id,
      shopping_mall_brand_id: brand.id,
      code: productCode,
      name: RandomGenerator.name(3),
      short_description: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      status: "active",
      is_multi_sku: true,
      primary_image_uri: "https://cdn.example.com/product.png",
      additional_data: null,
    } satisfies IShoppingMallProduct.ICreate;

    const product: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productCreateBody,
      });
    typia.assert(product);

    // Create SKU for this product
    const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
    const skuCreateBody = {
      code: skuCode,
      name: `${product.name} Variant`,
      listPrice: 10000,
      salePrice: 8000,
      currency: "KRW",
      isActive: true,
      isPurchasable: true,
    } satisfies IShoppingMallProductSku.ICreate;

    const sku: IShoppingMallProductSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productCode: product.code,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);

    // Create inventory item for the SKU
    const inventoryCreateBody = {
      product_sku_id: sku.id,
      on_hand_quantity: onHandQuantity,
      low_stock_threshold: undefined,
      backorder_enabled: false,
      preorder_enabled: false,
    } satisfies IShoppingMallInventoryItem.ICreate;

    const inventoryItem: IShoppingMallInventoryItem =
      await api.functional.shoppingMall.seller.inventoryItems.create(
        connection,
        {
          body: inventoryCreateBody,
        },
      );
    typia.assert(inventoryItem);

    return { seller, product, sku, inventoryItem };
  };

  // 3-5. Create inventory for seller A (5 units) and seller B (7 units)
  const sellerAResult = await createSellerWithInventory(
    "sellerA",
    5 satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  const sellerBResult = await createSellerWithInventory(
    "sellerB",
    7 satisfies number as number & tags.Type<"int32"> & tags.Minimum<0>,
  );

  // 6. Switch back to platform admin context via login (to be explicit)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 7. Call inventory stock level statistics endpoint as platform admin
  const stats: IShoppingMallInventoryStockStatistics =
    await api.functional.shoppingMall.platformAdmin.inventory.statistics.stockLevels.index(
      connection,
    );
  typia.assert(stats);

  // 8. Validate that aggregation includes both sellers' inventory
  const expectedTotalOnHand =
    sellerAResult.inventoryItem.on_hand_quantity +
    sellerBResult.inventoryItem.on_hand_quantity;
  const expectedTotalReserved = 0 as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const expectedTotalAvailable = expectedTotalOnHand;

  TestValidator.equals(
    "total_on_hand_units aggregates across sellers",
    stats.total_on_hand_units,
    expectedTotalOnHand,
  );

  TestValidator.equals(
    "total_reserved_units remains zero when no reservations exist",
    stats.total_reserved_units,
    expectedTotalReserved,
  );

  TestValidator.equals(
    "total_available_units matches total_on_hand_units when nothing reserved",
    stats.total_available_units,
    expectedTotalAvailable,
  );

  TestValidator.predicate(
    "sku_count should be at least the number of created SKUs",
    stats.sku_count >= 2,
  );
}
