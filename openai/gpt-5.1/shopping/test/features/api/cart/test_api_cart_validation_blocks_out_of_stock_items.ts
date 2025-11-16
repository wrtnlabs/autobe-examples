import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCartValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidation";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

/**
 * Validate that cart validation detects and blocks out-of-stock guest cart
 * lines.
 *
 * Business goal: Ensure that when a guest cart contains a SKU with requested
 * quantity greater than available inventory, the cart validation endpoint
 * responds successfully but marks the cart as invalid, returns blocking errors
 * tied to the offending cart line, and exposes a cart snapshot where the line
 * is not purchasable.
 *
 * Scenario outline:
 *
 * 1. Platform admin bootstraps global configuration required for a successful
 *    checkout context (region, shipping zone, payment method, brand).
 * 2. Seller creates a product under that brand and a concrete SKU variant.
 * 3. Seller creates an inventory item for the SKU with small on_hand_quantity and
 *    backorder disabled so overselling is not allowed.
 * 4. Guest (unauthenticated) creates a guest cart bound to the configured region
 *    code and adds a guest cart item for the SKU with quantity greater than
 *    on_hand_quantity.
 * 5. Guest calls POST /shoppingMall/carts/validate with a valid shipping address
 *    and the configured paymentMethodCode.
 * 6. The validation response should:
 *
 *    - Have isValid === false
 *    - Include at least one blockingErrors entry scoped to a line (scope === "line"
 *         or equivalent) whose lineId matches the created guest cart item id
 *         and whose code looks like an inventory/stock failure (the test will
 *         only assert that some blocking error for that line exists, not the
 *         exact code literal)
 *    - Have warnings array present (possibly empty) but irrelevant to pass/fail
 *    - Include cartSnapshot with lines where the snapshot for the offending line has
 *         quantity equal to the requested quantity and isPurchasable ===
 *         false.
 */
export async function test_api_cart_validation_blocks_out_of_stock_items(
  connection: api.IConnection,
) {
  // 0. Prepare helper to build a stable fake URL for href/referrer fields.
  const origin = "https://admin.shoppingmall.test";
  const platformHref = `${origin}/admin`;
  const platformReferrer = `${origin}/landing`;

  // 1. Register and login as platform admin to create global configs.
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: "Admin!234",
    ip: "127.0.0.1",
    href: platformHref as string & tags.Format<"uri">,
    referrer: platformReferrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: platformHref as string & tags.Format<"uri">,
    referrer: platformReferrer as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminSession);

  // 1-1. Create region configuration so that region_code is valid for the cart.
  const regionCode = "KR";
  const regionCreateBody = {
    code: regionCode,
    name: "Korea Region",
    iso_country_code: regionCode,
    currency_code: "KRW",
    timezone: "Asia/Seoul",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  // 1-2. Create a shipping zone linked to that region (or without explicit FK).
  const shippingZoneBody = {
    code: "KR_ZONE",
    name: "Korea Shipping Zone",
    description: "Domestic shipping in Korea",
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const shippingZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneBody },
    );
  typia.assert(shippingZone);

  // 1-3. Create a brand for the product.
  const brandBody = {
    name: "OutOfStock Test Brand",
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 1-4. Create a payment method that we will reference in validation request.
  const now = new Date();
  const startsAt = now.toISOString() as string & tags.Format<"date-time">;
  const endsAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const paymentMethodCode = `card_${RandomGenerator.alphaNumeric(6)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "Test payment method for cart validation",
    provider_key: "TEST_PROVIDER",
    method_type: "card",
    currency_restriction: "KRW",
    min_amount: 0,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 2. Register and login as seller.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Seller!234",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerSession: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerSession);

  // 3. Seller creates a product under this brand.
  const productCode = `SKU_PROD_${RandomGenerator.alphaNumeric(6)}` as string &
    tags.MinLength<1>;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: `Test Product ${RandomGenerator.name(1)}` as string &
      tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: false,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Seller creates a SKU for that product.
  const skuCode = `SKU_${RandomGenerator.alphaNumeric(6)}`;
  const skuBody = {
    code: skuCode,
    name: `Variant ${RandomGenerator.name(1)}`,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 5. Seller creates an inventory item for the SKU with low stock and backorder disabled.
  const inventoryOnHand: number & tags.Type<"int32"> & tags.Minimum<0> =
    1 as number & tags.Type<"int32"> & tags.Minimum<0>;

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: inventoryOnHand,
    low_stock_threshold: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventory);

  // 6. Create a guest cart in the configured region (unauthenticated context).
  const guestToken = RandomGenerator.alphaNumeric(16);
  const guestCartBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "e2e-test-agent",
    referrer: "https://shop.shoppingmall.test" as string & tags.Format<"uri">,
    region_code: regionCode,
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 7. Add a guest cart item for the SKU with quantity greater than on_hand_quantity.
  const requestedQuantity: number & tags.Type<"int32"> & tags.Minimum<1> =
    5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const guestCartItemBody = {
    sku_id: sku.id,
    quantity: requestedQuantity,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemBody,
    });
  typia.assert(guestCartItem);

  // 8. Build cart validation request with valid shipping address and paymentMethodCode.
  const shippingAddress = {
    countryCode: regionCode as string & tags.MinLength<2> & tags.MaxLength<2>,
    postalCode: "06236" as string & tags.MinLength<1>,
    stateOrProvince: "Seoul" as string & tags.MinLength<1>,
    city: "Seoul" as string & tags.MinLength<1>,
    addressLine1: "Gangnam-daero 123" as string & tags.MinLength<1>,
    addressLine2: "Unit 101" as string & tags.MinLength<1>,
    recipientName: "Guest Buyer" as string & tags.MinLength<1>,
    phoneNumber: RandomGenerator.mobile() as string & tags.MinLength<1>,
  } satisfies IShoppingMallCartValidation.IShippingAddress;

  const cartValidationBody = {
    shippingAddress,
    shippingMethodCode: undefined,
    paymentMethodCode: paymentMethodCode as string & tags.MinLength<1>,
    couponCodes: [],
    notes: "E2E test for out of stock validation",
  } satisfies IShoppingMallCartValidation.ICreate;

  // 9. Call cart validation API.
  const validationResult: IShoppingMallCartValidation =
    await api.functional.shoppingMall.carts.validate.create(connection, {
      body: cartValidationBody,
    });
  typia.assert(validationResult);

  // 10. Assert that the cart is not valid.
  TestValidator.predicate(
    "cart should be invalid when quantity exceeds inventory",
    validationResult.isValid === false,
  );

  // 11. There must be at least one blocking error.
  TestValidator.predicate(
    "validation should return at least one blocking error",
    validationResult.blockingErrors.length > 0,
  );

  // 12. Find blocking error tied to the offending cart line via lineId.
  const lineScopedErrors = validationResult.blockingErrors.filter((msg) => {
    return msg.lineId !== undefined && msg.lineId === guestCartItem.id;
  });

  TestValidator.predicate(
    "there should be a blocking error associated with the guest cart item lineId",
    lineScopedErrors.length > 0,
  );

  // 13. Optionally ensure at least one blocking error looks inventory-related by checking code/message keywords.
  const inventoryRelatedErrors = lineScopedErrors.filter((msg) => {
    const lowerCode = msg.code.toLowerCase();
    const lowerMessage = msg.message.toLowerCase();
    return (
      lowerCode.includes("stock") ||
      lowerCode.includes("inventory") ||
      lowerMessage.includes("stock") ||
      lowerMessage.includes("inventory")
    );
  });

  TestValidator.predicate(
    "at least one blocking error for the line should mention stock or inventory",
    inventoryRelatedErrors.length > 0,
  );

  // 14. Validate cart snapshot and line isPurchasable flag.
  TestValidator.predicate(
    "validation result should include a cart snapshot",
    validationResult.cartSnapshot !== undefined,
  );

  const snapshot = validationResult.cartSnapshot;

  if (snapshot !== undefined) {
    const matchedLines = snapshot.lines.filter((line) => {
      return line.lineId === guestCartItem.id;
    });

    TestValidator.predicate(
      "cart snapshot should contain a line for the guest cart item",
      matchedLines.length > 0,
    );

    const line = matchedLines[0];

    TestValidator.equals(
      "snapshot line quantity should match requested quantity",
      line.quantity,
      requestedQuantity,
    );

    TestValidator.predicate(
      "snapshot line should be marked as not purchasable",
      line.isPurchasable === false,
    );
  }
}
