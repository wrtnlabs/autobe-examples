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
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

export async function test_api_platformadmin_refund_transaction_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register platform admin and get authorized context
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // 2. Register customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/register",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 4. Switch to platformAdmin again by login (ensure admin context for admin-only APIs)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 5. Create category tree (not strictly required for order/refund but follows scenario intent)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 6. Create brand under platform admin
  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 7. Switch to seller context (seller is already authenticated by join, but ensure via login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 8. Create product as seller, associated with brand
  const productCode = `prd-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerLogin.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 9. Create product option type (e.g., Color)
  const optionTypeBody = {
    name: "Color",
    display_name: "Color",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;
  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode: product.code,
        body: optionTypeBody,
      },
    );
  typia.assert(optionType);

  // 10. Create product option value (e.g., Red)
  const optionValueBody = {
    value: "red",
    display_name: "Red",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;
  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode: product.code,
        productOptionTypeId: optionType.id,
        body: optionValueBody,
      },
    );
  typia.assert(optionValue);

  // 11. Create SKU for the product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const listPrice = 10000;
  const salePrice = 9000;
  const skuBody = {
    code: skuCode,
    name: "Test Product Red",
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode: product.code,
      body: skuBody,
    });
  typia.assert(sku);

  // 12. Create inventory item for SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;
  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 13. Switch to customer context via login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 14. Create customer cart
  const cartBody = {
    currency_code: sku.currency,
    region_code: "KR-Seoul",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  // 15. Add SKU to customer cart as cart item
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  // 16. Create order from customer cart
  const itemsSubtotal = salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "E2E order for refund test",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 17. Switch back to platform admin via login to perform payment and refund
  const platformAdminRelogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminRelogin);

  // 18. Create payment method configuration
  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card",
    description: "E2E test payment method",
    provider_key: "test-provider",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  // 19. Create payment transaction for the order
  const paymentAuthorizedAmount = grandTotal;
  const paymentCapturedAmount = grandTotal;
  const paymentTransactionBody = {
    orderId: order.id,
    customerId: customerLogin.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(10)}`,
    // providerName must be a plain string, not possibly null
    providerName: paymentMethod.code,
    providerTransactionId: `pt-${RandomGenerator.alphaNumeric(12)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: paymentAuthorizedAmount,
    capturedAmount: paymentCapturedAmount,
    paymentStatus: "payment_captured",
    providerStatus: "CAPTURED",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const paymentTransaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  // 20. Create refund transaction linked to payment and order
  const refundRequestedAmount = paymentTransaction.capturedAmount ?? grandTotal;
  const refundNumber = `RF-${RandomGenerator.alphaNumeric(12)}`;

  const refundCreateBody = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: refundNumber,
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "E2E refund test",
    requested_amount: refundRequestedAmount,
    approved_amount: refundRequestedAmount,
    refunded_amount: refundRequestedAmount,
    currency: paymentTransaction.currency,
    provider_refund_id: `pr-${RandomGenerator.alphaNumeric(10)}`,
    provider_status: "PENDING",
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const createdRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundCreateBody,
    });
  typia.assert(createdRefund);

  // 21. Retrieve refund transaction by ID as platform admin
  const retrievedRefund: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.at(connection, {
      refundTransactionId: createdRefund.id,
    });
  typia.assert(retrievedRefund);

  // 22. Validate key fields between creation response and retrieval
  TestValidator.equals(
    "refund id should match between create and get",
    retrievedRefund.id,
    createdRefund.id,
  );
  TestValidator.equals(
    "refund number should be preserved",
    retrievedRefund.refund_number,
    createdRefund.refund_number,
  );
  TestValidator.equals(
    "refund status should be consistent",
    retrievedRefund.refund_status,
    createdRefund.refund_status,
  );
  TestValidator.equals(
    "refund currency should be consistent",
    retrievedRefund.currency,
    createdRefund.currency,
  );
  TestValidator.equals(
    "requested amount should be consistent",
    retrievedRefund.requested_amount,
    createdRefund.requested_amount,
  );
  TestValidator.equals(
    "approved amount should be consistent",
    retrievedRefund.approved_amount ?? null,
    createdRefund.approved_amount ?? null,
  );
  TestValidator.equals(
    "refunded amount should be consistent",
    retrievedRefund.refunded_amount ?? null,
    createdRefund.refunded_amount ?? null,
  );

  TestValidator.equals(
    "refund payment transaction FK should match",
    retrievedRefund.shopping_mall_payment_transaction_id,
    createdRefund.shopping_mall_payment_transaction_id,
  );
  TestValidator.equals(
    "refund order FK should match",
    retrievedRefund.shopping_mall_order_id,
    createdRefund.shopping_mall_order_id,
  );

  TestValidator.equals(
    "embedded payment transaction id should match FK",
    retrievedRefund.paymentTransaction.id,
    retrievedRefund.shopping_mall_payment_transaction_id,
  );
  TestValidator.equals(
    "embedded order id should match FK",
    retrievedRefund.order.id,
    retrievedRefund.shopping_mall_order_id,
  );

  TestValidator.equals(
    "actor_type should remain admin",
    retrievedRefund.actor_type,
    createdRefund.actor_type,
  );

  // When actor_type is admin, initiatorPlatformAdmin should be present (if backend sets it)
  if (retrievedRefund.actor_type === "admin") {
    TestValidator.predicate(
      "initiatorPlatformAdmin should not be null for admin actor_type",
      retrievedRefund.initiatorPlatformAdmin !== null &&
        retrievedRefund.initiatorPlatformAdmin !== undefined,
    );
  }

  // 23. Call GET again to confirm idempotence and consistency
  const retrievedRefundAgain: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.at(connection, {
      refundTransactionId: createdRefund.id,
    });
  typia.assert(retrievedRefundAgain);

  TestValidator.equals(
    "second retrieval of refund should be identical to first retrieval",
    retrievedRefundAgain,
    retrievedRefund,
  );
}
