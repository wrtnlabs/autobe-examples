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
 * Validate that a platform administrator can delete backorder settings for a
 * specific inventory item after the full catalog → SKU → inventory chain has
 * been established.
 *
 * Business flow covered by this test:
 *
 * 1. Platform admin joins (auto-authenticated) using /auth/platformAdmin/join
 * 2. Platform admin creates a catalog brand
 * 3. Seller joins (auto-authenticated) using /auth/seller/join
 * 4. Seller creates a product associated with the created brand
 * 5. Seller creates a SKU under the product
 * 6. Seller creates an inventory item for the SKU
 * 7. Platform admin logs in again to restore admin auth context
 * 8. Platform admin creates backorder settings for the inventory item
 * 9. Platform admin deletes those backorder settings via erase endpoint
 * 10. Optionally, repeat delete to ensure idempotent behavior (no error)
 *
 * The test focuses on a successful happy-path scenario and basic business
 * validations:
 *
 * - All intermediate entities (admin, seller, brand, product, SKU, inventory
 *   item, backorder settings) are created and type-asserted.
 * - Backorder settings created for the inventory item reference the correct
 *   inventory item id.
 * - Deleting the backorder settings completes without error, and repeating the
 *   delete still does not throw, modeling idempotency.
 */
export async function test_api_inventory_backorder_settings_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticated)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoined: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoined);

  // 2. Platform admin creates a brand
  const brandSlugBase: string = RandomGenerator.alphaNumeric(8);
  const brandCreateBody = {
    name: `Brand ${brandSlugBase}`,
    slug: `brand-${brandSlugBase}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    logo_uri: undefined,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller joins (auto-authenticated)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Seller creates a product associated with the brand
  const productCode: string = `PRD-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Seller creates a SKU under the product
  const skuCode: string = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice = 100;
  const salePrice = 80;

  const skuCreateBody = {
    code: skuCode,
    name: `Variant ${skuCode}`,
    listPrice,
    salePrice,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 6. Seller creates an inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 7. Platform admin logs in again to restore admin context
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. Platform admin creates backorder settings for the inventory item
  const backorderCreateBody = {
    allow_backorder: true,
    max_backorder_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message:
      "This item is on backorder and will ship once restocked.",
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const backorderSetting: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventory.id,
        body: backorderCreateBody,
      },
    );
  typia.assert(backorderSetting);

  // Ensure backorder settings are associated with the correct inventory item
  TestValidator.equals(
    "backorder setting must reference the created inventory item",
    backorderSetting.inventoryItem.id,
    inventory.id,
  );

  // 9. Platform admin deletes backorder settings via erase endpoint
  await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.erase(
    connection,
    {
      inventoryItemId: inventory.id,
    },
  );

  // 10. Optional idempotency: second delete should also succeed without error
  await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.erase(
    connection,
    {
      inventoryItemId: inventory.id,
    },
  );

  // Final assertion that the flow reached completion after deletion
  TestValidator.predicate(
    "backorder settings delete flow completed without throwing",
    true,
  );
}
