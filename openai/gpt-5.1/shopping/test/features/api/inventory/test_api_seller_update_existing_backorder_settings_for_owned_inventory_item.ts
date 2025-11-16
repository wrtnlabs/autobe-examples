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

export async function test_api_seller_update_existing_backorder_settings_for_owned_inventory_item(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Register platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 3. Create brand as platform admin (current token belongs to admin due to join)
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
  typia.assert<IShoppingMallBrand>(brand);

  // 4. Switch to seller context explicitly via login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: "127.0.0.1",
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 5. Create a product owned by this seller
  const productCode: string & tags.MinLength<1> = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string & tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(3),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(12),
    additional_data: JSON.stringify({ source: "e2e-test" }),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 6. Create a SKU variant for that product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    listPrice: 10000,
    salePrice: 8000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallProductSku>(sku);

  // 7. Create an inventory item for the SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventory);

  // 8. Switch to platform admin context and create initial backorder settings
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminLogin);

  const initialBackorderCreateBody = {
    allow_backorder: true,
    max_backorder_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const initialBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventory.id,
        body: initialBackorderCreateBody,
      },
    );
  typia.assert<IShoppingMallBackorderSetting>(initialBackorder);

  // 9. Switch back to seller context and update backorder settings
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAgain);

  const updatedMessage: string & tags.MinLength<1> = RandomGenerator.paragraph({
    sentences: 3,
  }) satisfies string as string & tags.MinLength<1>;

  const updateBody = {
    allow_backorder: false,
    max_backorder_quantity: null,
    backorder_message: updatedMessage,
  } satisfies IShoppingMallBackorderSetting.IUpdate;

  const updatedBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.backorderSettings.update(
      connection,
      {
        inventoryItemId: inventory.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallBackorderSetting>(updatedBackorder);

  // 10. Business validations
  // Ensure settings are tied to the same inventory item
  TestValidator.equals(
    "backorder setting should belong to the same inventory item",
    updatedBackorder.inventoryItem.id,
    inventory.id,
  );

  // Ensure allow_backorder has been toggled from true to false
  TestValidator.equals(
    "allow_backorder should be updated to false",
    updatedBackorder.allow_backorder,
    false,
  );

  // Ensure max_backorder_quantity was cleared to null
  TestValidator.equals(
    "max_backorder_quantity should be cleared to null",
    updatedBackorder.max_backorder_quantity,
    null,
  );

  // Ensure backorder_message reflects the new message
  TestValidator.equals(
    "backorder_message should reflect the seller's update",
    updatedBackorder.backorder_message,
    updatedMessage,
  );
}
