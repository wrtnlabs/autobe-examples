import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAgeRestrictionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAgeRestrictionPolicy";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCancellationPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationPolicy";
import type { IShoppingMallCartValidation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartValidation";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallPolicySetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicySetting";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductComplianceFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductComplianceFlag";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";
import type { IShoppingMallRegionSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegionSetting";
import type { IShoppingMallReviewPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewPolicy";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShippingZoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingZoneSetting";

export async function test_api_cart_validation_for_valid_guest_cart(
  connection: api.IConnection,
) {
  // 1. Bootstrap platform admin account and authenticate
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminJoin);

  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 2. As platform admin, create core policy/configuration context
  const policySettingCode = RandomGenerator.alphaNumeric(8);
  const policySettingCreateBody = {
    code: policySettingCode,
    name: "default_policy_profile",
    category: "cart_validation",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallPolicySetting.ICreate;

  const policySetting: IShoppingMallPolicySetting =
    await api.functional.shoppingMall.platformAdmin.policySettings.create(
      connection,
      { body: policySettingCreateBody },
    );
  typia.assert(policySetting);

  const regionCode = "US";
  const regionCreateBody = {
    code: regionCode,
    name: "United States",
    iso_country_code: "US",
    currency_code: "USD",
    timezone: "America/New_York",
    active: true,
  } satisfies IShoppingMallRegionSetting.ICreate;

  const region: IShoppingMallRegionSetting =
    await api.functional.shoppingMall.platformAdmin.regionSettings.create(
      connection,
      { body: regionCreateBody },
    );
  typia.assert(region);

  const cancellationPolicyCode = RandomGenerator.alphaNumeric(8);
  const cancellationPolicyCreateBody = {
    code: cancellationPolicyCode,
    name: "default_cancellation",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allow_cancellation_before_shipment: true,
    allow_partial_cancellation: true,
    max_hours_after_payment: 24,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: null,
    effective_to: null,
    active: true,
    region_code: region.code,
    policy_setting_code: policySetting.code,
  } satisfies IShoppingMallCancellationPolicy.ICreate;

  const cancellationPolicy: IShoppingMallCancellationPolicy =
    await api.functional.shoppingMall.platformAdmin.cancellationPolicies.create(
      connection,
      { body: cancellationPolicyCreateBody },
    );
  typia.assert(cancellationPolicy);

  const refundPolicyCode = RandomGenerator.alphaNumeric(8);
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const refundPolicyCreateBody = {
    code: refundPolicyCode,
    name: "default_refund",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays: 30 as number & tags.Type<"int32"> & tags.Minimum<0>,
    maxRefundRate: 1.0,
    requireManualApprovalOverAmount: 100000,
    configurationPayload: RandomGenerator.content({ paragraphs: 1 }),
    isActive: true,
    effectiveFrom,
    effectiveUntil,
    regionCode: region.code,
    policySettingCode: policySetting.code,
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const refundPolicy: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      { body: refundPolicyCreateBody },
    );
  typia.assert(refundPolicy);

  const reviewPolicyCode = RandomGenerator.alphaNumeric(8);
  const reviewPolicyCreateBody = {
    code: reviewPolicyCode,
    name: "default_review",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    max_days_after_delivery_for_review: 30,
    allow_edit_within_days: 7,
    auto_hide_report_threshold: 10,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    shopping_mall_region_setting_id: region.id,
    shopping_mall_policy_setting_id: policySetting.id,
  } satisfies IShoppingMallReviewPolicy.ICreate;

  const reviewPolicy: IShoppingMallReviewPolicy =
    await api.functional.shoppingMall.platformAdmin.reviewPolicies.create(
      connection,
      { body: reviewPolicyCreateBody },
    );
  typia.assert(reviewPolicy);

  const ageRestrictionPolicyCode = RandomGenerator.alphaNumeric(8);
  const ageRestrictionPolicyCreateBody = {
    code: ageRestrictionPolicyCode,
    name: "adult_only",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    minimum_age_years: 18,
    require_verified_age: false,
    config_payload: RandomGenerator.content({ paragraphs: 1 }),
    active: true,
    effective_from: null,
    effective_to: null,
    region_setting_id: region.id,
    policy_setting_id: policySetting.id,
  } satisfies IShoppingMallAgeRestrictionPolicy.ICreate;

  const ageRestrictionPolicy: IShoppingMallAgeRestrictionPolicy =
    await api.functional.shoppingMall.platformAdmin.ageRestrictionPolicies.create(
      connection,
      { body: ageRestrictionPolicyCreateBody },
    );
  typia.assert(ageRestrictionPolicy);

  const shippingZoneCode = RandomGenerator.alphaNumeric(8);
  const shippingZoneCreateBody = {
    code: shippingZoneCode,
    name: "US_DEFAULT_ZONE",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    shopping_mall_region_setting_id: region.id,
  } satisfies IShoppingMallShippingZoneSetting.ICreate;

  const shippingZone: IShoppingMallShippingZoneSetting =
    await api.functional.shoppingMall.platformAdmin.shippingZoneSettings.create(
      connection,
      { body: shippingZoneCreateBody },
    );
  typia.assert(shippingZone);

  const brandSlug = RandomGenerator.alphaNumeric(10).toLowerCase();
  const brandCreateBody = {
    name: "AutoBE Test Brand",
    slug: brandSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.shoppingmall.test/logo.png" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  const paymentMethodCode = RandomGenerator.alphaNumeric(8);
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Credit Card (Test)",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test_provider",
    method_type: "card",
    currency_restriction: "USD",
    min_amount: 0,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: paymentMethodCreateBody },
    );
  typia.assert(paymentMethod);

  // 3. Bootstrap seller account and authenticate
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://shoppingmall.test/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 4. As seller, create product, SKU and inventory
  const productCode = `TEST-${RandomGenerator.alphaNumeric(8)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "AutoBE Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCode = `SKU-${RandomGenerator.alphaNumeric(6)}`;
  const skuCreateBody = {
    code: skuCode,
    name: "Default Variant",
    listPrice: 10000,
    salePrice: 9000,
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

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 5. As platform admin, optionally attach a non-blocking compliance flag
  const complianceFlagCreateBody = {
    shopping_mall_age_restriction_policy_id: ageRestrictionPolicy.id,
    flag_type: "age_restriction",
    flag_value: "18+",
    is_blocking_sale: false,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallProductComplianceFlag.ICreate;

  const complianceFlag: IShoppingMallProductComplianceFlag =
    await api.functional.shoppingMall.platformAdmin.products.complianceFlags.create(
      connection,
      {
        productCode: product.code,
        body: complianceFlagCreateBody,
      },
    );
  typia.assert(complianceFlag);

  // 6. As guest, create guest cart and add an item
  const guestToken = RandomGenerator.alphaNumeric(24);
  const guestCartCreateBody = {
    guest_token: guestToken,
    ip: "127.0.0.1",
    user_agent: "AutoBE-E2E-Client",
    referrer: "https://shoppingmall.test/catalog" as string &
      tags.Format<"uri">,
    region_code: region.code,
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  const guestCartItemCreateBody = {
    sku_id: sku.id,
    quantity: 2,
  } satisfies IShoppingMallGuestCartItem.ICreate;

  const guestCartItem: IShoppingMallGuestCartItem =
    await api.functional.shoppingMall.guestCarts.items.create(connection, {
      guestCartId: guestCart.id,
      body: guestCartItemCreateBody,
    });
  typia.assert(guestCartItem);

  // 7. Validate the cart
  const shippingAddress: IShoppingMallCartValidation.IShippingAddress = {
    countryCode: regionCode as string & tags.MinLength<2> & tags.MaxLength<2>,
    postalCode: "10001",
    stateOrProvince: "NY",
    city: "New York",
    addressLine1: "350 5th Ave",
    addressLine2: "Floor 10",
    recipientName: "AutoBE Guest",
    phoneNumber: RandomGenerator.mobile(),
  };

  const cartValidationCreateBody = {
    shippingAddress,
    shippingMethodCode: undefined,
    paymentMethodCode: paymentMethod.code,
    couponCodes: undefined,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCartValidation.ICreate;

  const validation: IShoppingMallCartValidation =
    await api.functional.shoppingMall.carts.validate.create(connection, {
      body: cartValidationCreateBody,
    });
  typia.assert(validation);

  // 8. Assertions on validation response
  TestValidator.predicate(
    "cart should be valid for checkout",
    validation.isValid === true,
  );

  TestValidator.equals(
    "no blocking errors for happy-path guest cart",
    validation.blockingErrors.length,
    0,
  );

  TestValidator.predicate(
    "warnings array should be defined (may be empty)",
    Array.isArray(validation.warnings),
  );

  TestValidator.predicate(
    "cart snapshot should exist",
    validation.cartSnapshot !== undefined,
  );

  if (validation.cartSnapshot) {
    const lines = validation.cartSnapshot.lines;
    TestValidator.equals("exactly one line in cart snapshot", lines.length, 1);

    const line = lines[0];

    TestValidator.equals(
      "line quantity matches guest cart item quantity",
      line.quantity,
      guestCartItem.quantity,
    );

    TestValidator.predicate(
      "line should be purchasable",
      line.isPurchasable === true,
    );
  }
}
