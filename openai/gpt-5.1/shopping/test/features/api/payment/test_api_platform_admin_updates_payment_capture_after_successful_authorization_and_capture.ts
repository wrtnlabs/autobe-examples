import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
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

export async function test_api_platform_admin_updates_payment_capture_after_successful_authorization_and_capture(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register and authenticate customer
  const customerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@customer.test.com",
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Register and authenticate seller
  const sellerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@seller.test.com",
    password: "P@ssw0rd!",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As platform admin, create category tree, brand, product, option type/value, SKU and inventory
  // Ensure we are logged in as platform admin again
  const adminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Create category tree (not directly needed for purchasing but keeps catalog realistic)
  const categoryTreeCreateBody = {
    code: "tree-" + RandomGenerator.alphaNumeric(8),
    name: "Main Catalog " + RandomGenerator.alphabets(4),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // Create brand
  const brandCreateBody = {
    name: "Brand " + RandomGenerator.alphabets(6),
    slug: "brand-" + RandomGenerator.alphaNumeric(6),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test.com/logo/" + RandomGenerator.alphaNumeric(8),
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Create product as seller (so we have a seller-owned product)
  const productCode = "prod-" + RandomGenerator.alphaNumeric(8);
  const sellerProductCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Product " + RandomGenerator.alphabets(6),
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri:
      "https://cdn.test.com/product/" + RandomGenerator.alphaNumeric(8),
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const sellerProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: sellerProductCreateBody,
    });
  typia.assert(sellerProduct);

  // Create option type under seller product
  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  // Create option value for that option type
  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  // Create SKU under seller product
  const skuCode = "sku-" + RandomGenerator.alphaNumeric(8);
  const skuCreateBody = {
    code: skuCode,
    name: "SKU " + skuCode,
    listPrice: 10000,
    salePrice: 9000,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sellerSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sellerSku);

  // Create inventory item for SKU so it is purchasable
  const inventoryCreateBody = {
    product_sku_id: sellerSku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventory: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 5. As customer, create a new persistent cart
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      campaign: "autobe-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  // 6. Add SKU as cart item
  const cartItemCreateBody = {
    skuId: sellerSku.id,
    quantity: 2,
    note: "Test order item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 7. Create order from cart with realistic monetary values
  const itemsSubtotalAmount = sellerSku.salePrice * cartItem.quantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 2500;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.equals(
    "order grand_total_amount should match snapshot",
    order.grand_total_amount,
    grandTotalAmount,
  );

  // 8. As platform admin, create payment method
  const adminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const paymentMethodCode = "pm-" + RandomGenerator.alphaNumeric(8);
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Test Card Method",
    description: "Test payment method for e2e",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(paymentMethod);

  // 9. As platform admin, create payment transaction for the order
  const paymentTransactionCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: "intent-" + RandomGenerator.alphaNumeric(10),
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: null,
    currency: order.currency_code,
    authorizedAmount: null,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;
  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionCreateBody,
      },
    );
  typia.assert(paymentTransaction);

  TestValidator.equals(
    "payment transaction orderId should match order.id",
    paymentTransaction.orderId,
    order.id,
  );

  // 10. As platform admin, create payment authorization for order grand total
  const authorizationCreateBody = {
    amount: grandTotalAmount,
    currency: order.currency_code,
    gateway_code: paymentMethod.provider_key ?? "test-gateway",
    gateway_authorization_id: "auth-" + RandomGenerator.alphaNumeric(12),
    channel: "web",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;
  const authorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: authorizationCreateBody,
      },
    );
  typia.assert(authorization);

  TestValidator.equals(
    "authorization amount should match grand total",
    authorization.amount,
    grandTotalAmount,
  );

  // 11. As platform admin, create payment capture for authorized amount
  const captureCreateBody = {
    shopping_mall_payment_authorization_id: authorization.id,
    provider_capture_id: null,
    amount: authorization.amount,
    currency: authorization.currency,
    capture_status: "capture_succeeded",
    provider_status: "succeeded",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;
  const originalCapture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        body: captureCreateBody,
      },
    );
  typia.assert(originalCapture);

  TestValidator.equals(
    "capture amount should match authorization amount",
    originalCapture.amount,
    authorization.amount,
  );
  TestValidator.equals(
    "capture currency should match authorization currency",
    originalCapture.currency,
    authorization.currency,
  );
  TestValidator.equals(
    "capture paymentTransaction id should match",
    originalCapture.paymentTransaction.id,
    paymentTransaction.id,
  );

  // 12. As platform admin, update mutable fields on capture via PUT
  const updatedProviderCaptureId = "cap-" + RandomGenerator.alphaNumeric(12);
  const updatedCaptureStatus = "capture_failed";
  const updatedProviderStatus = "failed_at_gateway";
  const updatedFailureReasonCode = "gateway_error";
  const updatedFailureReasonMessage =
    "Gateway internal error during settlement";

  const captureUpdateBody = {
    provider_capture_id: updatedProviderCaptureId,
    capture_status: updatedCaptureStatus,
    provider_status: updatedProviderStatus,
    failure_reason_code: updatedFailureReasonCode,
    failure_reason_message: updatedFailureReasonMessage,
  } satisfies IShoppingMallPaymentCapture.IUpdate;

  const updatedCapture: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.update(
      connection,
      {
        paymentTransactionId: paymentTransaction.id,
        captureId: originalCapture.id,
        body: captureUpdateBody,
      },
    );
  typia.assert(updatedCapture);

  // 13. Assert immutable financial and relational fields are unchanged
  TestValidator.equals(
    "capture id should remain same after update",
    updatedCapture.id,
    originalCapture.id,
  );
  TestValidator.equals(
    "capture amount should remain unchanged",
    updatedCapture.amount,
    originalCapture.amount,
  );
  TestValidator.equals(
    "capture currency should remain unchanged",
    updatedCapture.currency,
    originalCapture.currency,
  );
  TestValidator.equals(
    "capture paymentTransaction should remain associated with same transaction",
    updatedCapture.paymentTransaction.id,
    originalCapture.paymentTransaction.id,
  );

  // 14. Assert mutable provider/status fields are updated
  TestValidator.equals(
    "provider_capture_id should be updated",
    updatedCapture.providerCaptureId,
    updatedProviderCaptureId,
  );
  TestValidator.equals(
    "capture status should be updated",
    updatedCapture.status,
    updatedCaptureStatus,
  );
  TestValidator.equals(
    "provider status should be updated",
    updatedCapture.providerStatus,
    updatedProviderStatus,
  );
  TestValidator.equals(
    "failure_reason_code should be updated",
    updatedCapture.failureReasonCode,
    updatedFailureReasonCode,
  );
  TestValidator.equals(
    "failure_reason_message should be updated",
    updatedCapture.failureReasonMessage,
    updatedFailureReasonMessage,
  );
}
