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
 * Validate that a platform administrator can create backorder settings for a
 * newly onboarded inventory item and that non-admins are forbidden.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a platform admin actor via
 *    /auth/platformAdmin/join.
 * 2. As platform admin, create a brand via /shoppingMall/platformAdmin/brands.
 * 3. Register and authenticate a seller actor via /auth/seller/join.
 * 4. As the seller, create a product associated with the seller and optionally the
 *    brand via /shoppingMall/seller/products.
 * 5. As the seller, create a SKU variant for the product via
 *    /shoppingMall/seller/products/{productCode}/skus.
 * 6. As the seller, create an inventory item for the SKU via
 *    /shoppingMall/seller/inventoryItems and capture its id.
 * 7. Switch back to the platform admin context via /auth/platformAdmin/login (or
 *    reuse join response).
 * 8. As platform admin, create backorder settings for the inventory item via POST
 *    /shoppingMall/platformAdmin/inventoryItems/{inventoryItemId}/backorderSettings
 *    using an IShoppingMallBackorderSetting.ICreate payload.
 * 9. Assert that the response is a valid IShoppingMallBackorderSetting, that
 *    backorder.inventoryItem.id equals the created inventory item id, and that
 *    allow_backorder, max_backorder_quantity, and backorder_message match the
 *    request.
 * 10. Attempt to call the same backorder settings creation endpoint as the seller
 *     and verify it fails using TestValidator.error to prove only platform
 *     admins can configure backorder settings.
 */
export async function test_api_platform_admin_create_backorder_settings_for_new_inventory_item(
  connection: api.IConnection,
) {
  // 1. Register platform admin
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuth);

  // 2. Create a brand as platform admin (optional association for product)
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.test.local/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 4. As seller, create a product
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.test.local/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product code should match created product",
    product.code,
    productCode,
  );

  // 5. As seller, create SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "sku productCode should match parent product code",
    sku.productCode,
    product.code,
  );

  // 6. As seller, create inventory item for SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 7. Switch back to platform admin context via login to ensure token context
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test.local/login",
    referrer: "https://admin.test.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. As platform admin, create backorder settings for the inventory item
  const backorderCreateBody = {
    allow_backorder: true,
    max_backorder_quantity: 100 as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    backorder_message: RandomGenerator.paragraph({ sentences: 4 }) as string &
      tags.MinLength<1>,
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

  // 9. Assert linkage and field echo
  TestValidator.equals(
    "backorder setting must be linked to correct inventory item",
    backorderSetting.inventoryItem.id,
    inventory.id,
  );
  TestValidator.equals(
    "allow_backorder must match request",
    backorderSetting.allow_backorder,
    backorderCreateBody.allow_backorder,
  );
  TestValidator.equals(
    "max_backorder_quantity must match request",
    backorderSetting.max_backorder_quantity,
    backorderCreateBody.max_backorder_quantity,
  );
  TestValidator.equals(
    "backorder_message must match request",
    backorderSetting.backorder_message,
    backorderCreateBody.backorder_message,
  );

  // 10. Negative scenario: seller should not be able to create backorder settings
  // Switch auth context to seller
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.local/login",
    referrer: "https://seller.test.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  await TestValidator.error(
    "seller must not be able to call platform admin backorder settings endpoint",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
        connection,
        {
          inventoryItemId: inventory.id,
          body: backorderCreateBody,
        },
      );
    },
  );
}
