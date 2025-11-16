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
 * Validate seller ability to update backorder settings with correct limits and
 * flags.
 *
 * Business context:
 *
 * - A platform admin can initialize backorder settings for a specific inventory
 *   item (per-SKU configuration).
 * - A seller should then be able to adjust those settings through the seller
 *   endpoint, as long as they respect core business constraints:
 *
 *   - Allow_backorder is a boolean flag controlling whether overselling is allowed.
 *   - Max_backorder_quantity must be a non-negative integer when provided.
 *   - Backorder_message is optional but, when present, must be non-empty.
 *
 * Scenario steps:
 *
 * 1. Register a seller via /auth/seller/join to obtain an authenticated seller
 *    session.
 * 2. Register a platform admin via /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 3. As the platform admin, create a brand to attach to the seller's product.
 * 4. Switch authentication to the seller and create a product bound to this seller
 *    and optionally to the created brand.
 * 5. Under the seller context, create a SKU for that product.
 * 6. Still as seller, create an inventory item for that SKU with sane starting
 *    quantities and flags.
 * 7. Switch authentication back to platform admin, and create backorder settings
 *    for that inventory item with allow_backorder=true, a modest
 *    max_backorder_quantity, and an initial backorder_message.
 * 8. Switch back to the seller context.
 * 9. Using the seller endpoint, update the backorder settings for the same
 *    inventory item with an IShoppingMallBackorderSetting.IUpdate payload
 *    that:
 *
 *    - Explicitly sets allow_backorder=true,
 *    - Increases max_backorder_quantity to a larger non-negative int,
 *    - Updates backorder_message to new explanatory text.
 * 10. Assert that the response type is valid and that business expectations hold:
 *
 *     - InventoryItem.id matches the original inventory item id,
 *     - Allow_backorder is true after the update,
 *     - Max_backorder_quantity is updated and strictly greater than the initial
 *           value,
 *     - Backorder_message equals the new value and differs from the original.
 */
export async function test_api_seller_update_backorder_settings_validates_limits_and_flags(
  connection: api.IConnection,
) {
  // 1. Register seller
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

  // 2. Register platform admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;
  const adminPassword = adminJoinBody.password;

  // 3. As platform admin, create a brand
  const brandCreateBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Switch to seller: login to ensure seller context is active
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // Create a product for this seller
  const productCode = RandomGenerator.alphaNumeric(16);
  const productCreateBody = {
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-main.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Create a SKU for that product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
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
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: true,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 7. Switch to platform admin and create initial backorder settings
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const initialBackorderBody = {
    allow_backorder: true,
    max_backorder_quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_message: "Initial backorder allowed up to 5 units.",
  } satisfies IShoppingMallBackorderSetting.ICreate;
  const initialBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.platformAdmin.inventoryItems.backorderSettings.create(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: initialBackorderBody,
      },
    );
  typia.assert(initialBackorder);

  const initialMaxQuantity = initialBackorder.max_backorder_quantity ?? 0;
  const initialMessage = initialBackorder.backorder_message ?? "";

  // 8. Switch back to seller context
  const sellerReloginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login2",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerReloggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginBody,
    });
  typia.assert(sellerReloggedIn);

  // 9. Seller updates backorder settings with increased max quantity and new message
  const updatedMaxQuantity = initialMaxQuantity + 10;
  const updatedMessage =
    "Backorders allowed up to a higher limit with longer lead time.";

  const updateBody = {
    allow_backorder: true,
    max_backorder_quantity: updatedMaxQuantity as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    backorder_message: updatedMessage,
  } satisfies IShoppingMallBackorderSetting.IUpdate;

  const updatedBackorder: IShoppingMallBackorderSetting =
    await api.functional.shoppingMall.seller.inventoryItems.backorderSettings.update(
      connection,
      {
        inventoryItemId: inventoryItem.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBackorder);

  // 10. Assertions: inventory item id stable
  TestValidator.equals(
    "inventory item id remains stable after backorder update",
    updatedBackorder.inventoryItem.id,
    inventoryItem.id,
  );

  // allow_backorder is true
  TestValidator.predicate(
    "allow_backorder remains true after seller update",
    updatedBackorder.allow_backorder === true,
  );

  // max_backorder_quantity increased
  const updatedMaxFromResponse = updatedBackorder.max_backorder_quantity ?? 0;
  TestValidator.predicate(
    "max_backorder_quantity increased to a larger non-negative value",
    updatedMaxFromResponse >= 0 && updatedMaxFromResponse > initialMaxQuantity,
  );

  // backorder_message updated
  const updatedMessageFromResponse = updatedBackorder.backorder_message ?? "";
  TestValidator.equals(
    "backorder_message reflects the new seller-provided copy",
    updatedMessageFromResponse,
    updatedMessage,
  );
  TestValidator.notEquals(
    "backorder_message differs from the initial admin-provided message",
    updatedMessageFromResponse,
    initialMessage,
  );
}
