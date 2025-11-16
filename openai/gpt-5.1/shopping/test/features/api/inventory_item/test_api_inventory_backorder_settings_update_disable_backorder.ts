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
 * Verify that a platform administrator can disable backorders for an inventory
 * item and clear related backorder configuration using the update endpoint.
 *
 * Business flow:
 *
 * 1. Join as platform admin to obtain admin auth context.
 * 2. Create a brand via platformAdmin brand API.
 * 3. Join as seller and obtain seller auth context.
 * 4. As seller, create a product associated to the created brand.
 * 5. As seller, create a SKU under the product.
 * 6. As seller, create an inventory item for that SKU (with backorder enabled
 *    initially).
 * 7. Switch back to platform admin and create initial backorder settings with
 *    allow_backorder=true and a finite max_backorder_quantity plus a message.
 * 8. Call the target update endpoint setting allow_backorder=false and explicitly
 *    nulling max_backorder_quantity and backorder_message.
 * 9. Assert response shows allow_backorder=false and cleared nullable fields.
 * 10. Call the same update again with the same payload and assert configuration
 *     stays identical (idempotency check).
 */
export async function test_api_inventory_backorder_settings_update_disable_backorder(
  connection: api.IConnection,
) {
  // 1. Platform admin join to establish admin context
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
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
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. Seller join to create catalog and inventory
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. Create a product as seller, associated to the brand
  const productCode = RandomGenerator.alphaNumeric(10);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 3 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. Create an inventory item for that SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | undefined,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 7. Ensure platform admin auth context and seed initial backorder settings
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

  const initialBackorderCreateBody = {
    allow_backorder: true,
    max_backorder_quantity: 50 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    backorder_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallBackorderSetting.ICreate;

  const initialBackorderSetting: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: initialBackorderCreateBody,
      },
    );
  typia.assert(initialBackorderSetting);

  TestValidator.predicate(
    "initial backorder settings should allow backorder",
    initialBackorderSetting.allow_backorder === true,
  );

  // 8. Update backorder settings: disable backorders and clear nullable fields
  const disableBackorderBody = {
    allow_backorder: false,
    max_backorder_quantity: null,
    backorder_message: null,
  } satisfies IShoppingMallBackorderSetting.IUpdate;

  const updatedSetting: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: disableBackorderBody,
      },
    );
  typia.assert(updatedSetting);

  TestValidator.predicate(
    "updated settings should have allow_backorder=false",
    updatedSetting.allow_backorder === false,
  );
  TestValidator.equals(
    "updated settings should clear max_backorder_quantity",
    updatedSetting.max_backorder_quantity,
    null,
  );
  TestValidator.equals(
    "updated settings should clear backorder_message",
    updatedSetting.backorder_message,
    null,
  );

  // 9. Idempotent update: call update again with same payload and verify config stays the same
  const updatedSettingAgain: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: disableBackorderBody,
      },
    );
  typia.assert(updatedSettingAgain);

  TestValidator.equals(
    "idempotent update should keep allow_backorder=false",
    updatedSettingAgain.allow_backorder,
    updatedSetting.allow_backorder,
  );
  TestValidator.equals(
    "idempotent update should keep max_backorder_quantity null",
    updatedSettingAgain.max_backorder_quantity,
    updatedSetting.max_backorder_quantity,
  );
  TestValidator.equals(
    "idempotent update should keep backorder_message null",
    updatedSettingAgain.backorder_message,
    updatedSetting.backorder_message,
  );
}
