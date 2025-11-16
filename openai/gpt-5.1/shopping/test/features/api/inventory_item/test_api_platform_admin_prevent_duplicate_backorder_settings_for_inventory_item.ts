import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBackorderSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBackorderSetting";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Ensure inventory backorder settings are unique per item.
 *
 * Business goal: Validate that the platform administrator API for creating
 * backorder settings for an inventory item enforces the invariant that there
 * can be at most one active backorder settings row per inventory item. When a
 * second creation attempt is made for the same inventory item, the backend must
 * reject it instead of overwriting the existing settings.
 *
 * High-level flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. Register and authenticate a seller.
 * 3. As platform admin, create a brand that will be associated with the catalog
 *    product.
 * 4. As seller, create a product, then a SKU under that product, then an inventory
 *    item for that SKU.
 * 5. Switch back to the platform admin context and create initial backorder
 *    settings for the inventory item via POST
 *    /shoppingMall/platformAdmin/inventoryItems/{inventoryItemId}/backorderSettings.
 * 6. Attempt a second creation of backorder settings for the same inventoryItemId
 *    with another valid payload.
 * 7. Assert that the first call succeeds and returns a proper
 *    IShoppingMallBackorderSetting, and that the second call fails with a
 *    business error (using TestValidator.error without checking the exact HTTP
 *    status code).
 */
export async function test_api_platform_admin_prevent_duplicate_backorder_settings_for_inventory_item(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
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

  const platformAdminEmail = platformAdmin.email;
  const platformAdminPassword = platformAdminJoinBody.password;

  // 2. Register and authenticate a seller
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

  const sellerEmail = sellerAuthorized.email;
  const sellerPassword = sellerJoinBody.password;

  // 3. Switch to platform admin explicitly via login (actor switching test)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3-1. Create a brand as platform admin
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller context by logging in as the seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4-1. Create a product for the seller
  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4-2. Create a SKU under the product
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4-3. Create an inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 5. Switch back to platform admin context via login
  const adminReLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login2",
    referrer: "https://admin.example.com/dashboard2",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminReLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminReLoginBody,
    });
  typia.assert(adminReLogin);

  // 5-1. Create initial backorder settings for the inventory item
  const backorderCreateBody1 = {
    allow_backorder: true,
    max_backorder_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const backorderSetting1: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: backorderCreateBody1,
      },
    );
  typia.assert(backorderSetting1);

  TestValidator.equals(
    "first backorder setting is linked to correct inventory item",
    backorderSetting1.inventoryItem.id,
    inventoryItem.id,
  );

  // 6. Attempt to create a second backorder settings record
  const backorderCreateBody2 = {
    allow_backorder: false,
    max_backorder_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallBackorderSetting.ICreate;

  await TestValidator.error(
    "second backorder settings creation for same inventory item must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          body: backorderCreateBody2,
        },
      );
    },
  );
}
