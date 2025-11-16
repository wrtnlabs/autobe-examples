import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validate idempotent deletion of backorder settings when none exist.
 *
 * Business flow:
 *
 * 1. Seller joins and becomes authenticated.
 * 2. Seller creates a product bound to themselves.
 * 3. Seller creates a SKU under that product.
 * 4. Seller creates an inventory item for that SKU.
 * 5. Platform admin joins (and thus authenticates) in the same connection.
 * 6. Platform admin calls DELETE backorderSettings for the inventory item twice.
 *
 * Expectations:
 *
 * - All creation APIs succeed and return correctly typed DTOs.
 * - Both erase calls complete without throwing, even though no backorder settings
 *   have been created.
 * - The second erase behaves the same as the first (idempotent clean-up
 *   behavior).
 */
export async function test_api_inventory_backorder_settings_delete_idempotent_when_missing(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product bound to themselves
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: null,
    code: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Sanity check: product seller summary matches sellerAuthorized
  TestValidator.equals(
    "product seller id should equal sellerAuthorized id",
    product.seller.id,
    sellerAuthorized.id,
  );

  // 3. Seller creates a SKU under the product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Sanity: sku.product.id should match product.id
  TestValidator.equals(
    "sku.product.id should equal product.id",
    sku.product.id,
    product.id,
  );

  // 4. Seller creates an inventory item for that SKU
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // Basic sanity: inventory item is linked to the SKU we created
  TestValidator.equals(
    "inventory product_sku_id should equal sku.id",
    inventoryItem.product_sku_id,
    sku.id,
  );

  // 5. Platform admin joins (and authenticates)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(2),
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuth);

  // Optional: exercise platform admin login as well
  const platformAdminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.test.local/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoginAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminLoginAuth);

  // 6 & 7. Platform admin calls erase backorder settings twice
  await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
    },
  );

  await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
    },
  );

  // If we reached here without HttpError, idempotent deletion behavior is validated.
  TestValidator.predicate(
    "backorderSettings.erase should be idempotent when settings are missing",
    true,
  );
}
