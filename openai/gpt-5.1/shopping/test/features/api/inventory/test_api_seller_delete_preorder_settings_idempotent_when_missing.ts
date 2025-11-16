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
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify DELETE
 * /shoppingMall/seller/inventoryItems/{inventoryItemId}/preorderSettings is
 * safe and idempotent when no preorder settings exist for the target inventory
 * item.
 *
 * Business context: Sellers or cleanup jobs should be able to call the
 * preorder-settings DELETE endpoint without first checking whether preorder
 * configuration exists. The operation must be idempotent: deleting when nothing
 * exists should still succeed and must not affect the underlying inventory
 * item.
 *
 * Steps:
 *
 * 1. Join as a seller, establishing the seller actor.
 * 2. Join as a platform admin and create a brand for realistic catalog data.
 * 3. Log back in as the seller.
 * 4. Create a product owned by the seller and linked to the created brand.
 * 5. Create an option type for that product.
 * 6. Create a single option value under the option type.
 * 7. Create a SKU for the product.
 * 8. Create an inventory item for the SKU, but DO NOT create any preorder settings
 *    for it.
 * 9. Call DELETE preorderSettings once for the inventory item and ensure it
 *    completes without error.
 * 10. Call DELETE preorderSettings again for the same inventory item to validate
 *     idempotency (still no error).
 * 11. Use the initial inventory snapshot to assert that key stock-related fields
 *     are unchanged by the DELETE operations.
 */
export async function test_api_seller_delete_preorder_settings_idempotent_when_missing(
  connection: api.IConnection,
) {
  // 1. Seller join
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

  const sellerId = sellerAuthorized.id;

  // 2. Platform admin join and create brand
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
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

  // 3. Log back in as seller to perform seller-scoped operations
  const sellerLoginBody = {
    email: sellerJoinBody.email,
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
  TestValidator.equals(
    "seller login id matches join id",
    sellerLogin.id,
    sellerId,
  );

  // 4. Create product for this seller with the created brand
  const productCode = "PROD-" + RandomGenerator.alphaNumeric(8);
  const productCreateBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.example.com/product/" + RandomGenerator.alphaNumeric(12),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "product code should match requested code",
    product.code,
    productCode,
  );

  // 5. Create option type for the product
  const optionTypeCreateBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // 6. Create single option value under that type
  const optionValueCreateBody = {
    value: "red",
    display_name: "Red",
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);
  TestValidator.equals(
    "created option value belongs to option type",
    optionValue.optionType.id,
    optionType.id,
  );

  // 7. Create a SKU for the product
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(8);
  const skuCreateBody = {
    code: skuCode,
    name: "Red Variant",
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);
  TestValidator.equals(
    "SKU productCode matches product code",
    sku.productCode,
    productCode,
  );

  // 8. Create inventory item for the SKU; no preorder settings will be created
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10,
    low_stock_threshold: 2,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // Snapshot of initial inventory state for comparison
  const initialOnHand = inventoryItem.on_hand_quantity;
  const initialReserved = inventoryItem.reserved_quantity;
  const initialBackorderEnabled = inventoryItem.backorder_enabled;
  const initialPreorderEnabled = inventoryItem.preorder_enabled;

  // 9. First DELETE: should succeed even though no preorder settings exist
  await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
    },
  );

  // 10. Second DELETE: verify idempotency by ensuring it also succeeds
  await api.functional.shoppingMall.seller.inventoryItems.preorderSettings.erase(
    connection,
    {
      inventoryItemId: inventoryItem.id,
    },
  );

  // 11. Business assertions based on initial snapshot (same object reference)
  TestValidator.predicate(
    "DELETE preorderSettings should not change on_hand_quantity snapshot",
    inventoryItem.on_hand_quantity === initialOnHand,
  );
  TestValidator.predicate(
    "DELETE preorderSettings should not change reserved_quantity snapshot",
    inventoryItem.reserved_quantity === initialReserved,
  );
  TestValidator.predicate(
    "DELETE preorderSettings should not change backorder_enabled snapshot",
    inventoryItem.backorder_enabled === initialBackorderEnabled,
  );
  TestValidator.predicate(
    "DELETE preorderSettings should not change preorder_enabled snapshot",
    inventoryItem.preorder_enabled === initialPreorderEnabled,
  );
}
