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

export async function test_api_inventory_backorder_settings_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join implicitly logs in and sets token header)
  const platformAdminEmail: string & tags.Format<"email"> =
    "platform-admin-" + RandomGenerator.alphaNumeric(8) + "@example.com";

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a brand as platform admin
  const brandCreateBody = {
    name:
      "Brand " +
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    slug: "brand-" + RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
    logo_uri:
      "https://cdn.example.com/logos/" +
      RandomGenerator.alphaNumeric(12) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Register a seller (join implicitly logs in and sets token header)
  const sellerEmail: string & tags.Format<"email"> =
    "seller-" + RandomGenerator.alphaNumeric(8) + "@example.com";

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    storeName: "Store " + RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product as the seller (seller token is already set by join)
  const productCode = "PRD-" + RandomGenerator.alphaNumeric(10);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name:
      "Product " +
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    short_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/products/" +
      RandomGenerator.alphaNumeric(12) +
      ".jpg",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product code must match requested code",
    product.code,
    productCode,
  );

  // 5. Create a SKU for that product as the seller
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(10);

  const skuCreateBody = {
    code: skuCode,
    name:
      "SKU " +
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 6 }),
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
    "sku productCode must match product.code",
    sku.productCode,
    product.code,
  );

  // 6. Create an inventory item for the SKU as the seller
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  TestValidator.equals(
    "inventory product_sku_id must match sku.id",
    inventoryItem.product_sku_id,
    sku.id,
  );

  // 7. Log back in as platform admin to ensure platform admin token is active
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 8. Create initial backorder settings for the inventory item as platform admin
  const initialBackorderBody = {
    allow_backorder: true,
    max_backorder_quantity: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: "Initial backorder allowed up to 50 units.",
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const initialBackorderSetting: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: initialBackorderBody,
      },
    );
  typia.assert(initialBackorderSetting);

  TestValidator.equals(
    "initial backorder setting inventoryItem id should match inventory item",
    initialBackorderSetting.inventoryItem.id,
    inventoryItem.id,
  );

  // 9. Update the backorder settings via PUT as platform admin
  const updatedBackorderBody = {
    allow_backorder: false,
    max_backorder_quantity: 20 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: "Backorder temporarily limited to 20 units.",
  } satisfies IShoppingMallBackorderSetting.IUpdate;

  const updatedBackorderSetting: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: updatedBackorderBody,
      },
    );
  typia.assert(updatedBackorderSetting);

  // 10. Validate updated settings fields
  TestValidator.equals(
    "updated backorder setting inventoryItem id should match inventory item",
    updatedBackorderSetting.inventoryItem.id,
    inventoryItem.id,
  );

  TestValidator.equals(
    "allow_backorder should be updated to false",
    updatedBackorderSetting.allow_backorder,
    updatedBackorderBody.allow_backorder,
  );

  TestValidator.equals(
    "max_backorder_quantity should be updated to 20",
    updatedBackorderSetting.max_backorder_quantity,
    updatedBackorderBody.max_backorder_quantity,
  );

  TestValidator.equals(
    "backorder_message should be updated",
    updatedBackorderSetting.backorder_message,
    updatedBackorderBody.backorder_message,
  );

  // 11. Negative authorization check (seller must not be allowed to update backorder settings)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  await TestValidator.error(
    "seller should not be authorized to update backorder settings",
    async () => {
      await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.update(
        connection,
        {
          inventoryItemId: inventoryItem.id,
          body: {
            allow_backorder: true,
            max_backorder_quantity: 5 as number &
              tags.Type<"int32"> &
              tags.Minimum<0>,
            backorder_message: "Seller trying to change backorder settings.",
          } satisfies IShoppingMallBackorderSetting.IUpdate,
        },
      );
    },
  );
}
