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
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundItem";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a platform admin can create a refund item without an order line
 * reference.
 *
 * Business goals:
 *
 * - Prove that `shopping_mall_order_line_id` can be null for a refund item (e.g.
 *   shipping-only or global adjustment refund).
 * - Ensure the created refund item respects the parent refund transaction amounts
 *   and persists its component_type/description correctly.
 *
 * End-to-end steps:
 *
 * 1. Platform admin joins (admin auth context established).
 * 2. Admin creates catalog context: category tree, brand, product, SKU.
 * 3. Customer joins and creates a cart; adds one SKU as cart item.
 * 4. Customer creates an order from the cart with simple, self-consistent monetary
 *    snapshots (subtotal, shipping, tax, grand total).
 * 5. Admin creates a payment method and a payment transaction that fully captures
 *    the order grand total.
 * 6. Admin (or internal flow) creates a refund transaction for a small
 *    shipping-related adjustment that is less than or equal to the captured
 *    amount.
 * 7. Admin calls POST
 *    /shoppingMall/platformAdmin/refundTransactions/{refundTransactionId}/items
 *    with IShoppingMallRefundItem.ICreate where:
 *
 *    - Shopping_mall_order_line_id is explicitly null,
 *    - Component_type expresses a non-line-specific component ("shipping"),
 *    - Gross_amount equals the requested refund amount.
 * 8. Assertions:
 *
 *    - The refund item is created successfully.
 *    - Its shopping_mall_order_line_id is null.
 *    - Its component_type and description match the request.
 *    - Gross_amount equals the requested value and is <= parent
 *         refundTransaction.requested_amount.
 */
export async function test_api_platform_admin_create_refund_item_without_order_line_reference(
  connection: api.IConnection,
) {
  // 1. Platform admin join (auto-login via SDK)
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Catalog setup: category tree, brand, product, SKU
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Tree",
    description: "Main category tree for tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "Test brand",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // Seller id is not creatable from given APIs; use a random UUID to satisfy DTO.
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const productCode = `prod-${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: randomSellerId,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Product",
    short_description: "Short description",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(6)}`,
    name: "Default SKU",
    listPrice: 50,
    salePrice: 50,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Customer join and cart setup
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
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

  const cartItemBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Test cart item",
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

  // 4. Order creation with simple, self-consistent monetary snapshot
  const itemsSubtotal = 50;
  const discountTotal = 0;
  const shippingTotal = 5;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 5. Payment method and payment transaction
  const paymentMethodBody = {
    code: `pm-${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Test Card",
    description: "Test payment method",
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

  const paymentTransactionBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: null,
    providerName: paymentMethod.provider_key ?? "test-gateway",
    providerTransactionId: null,
    currency: "USD" as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: grandTotal,
    capturedAmount: grandTotal,
    paymentStatus: "payment_captured",
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
        body: paymentTransactionBody,
      },
    );
  typia.assert(paymentTransaction);

  // 6. Refund transaction for a small shipping-related adjustment
  const requestedRefundAmount = 5;

  const refundTransactionBody = {
    shopping_mall_payment_transaction_id: paymentTransaction.id,
    shopping_mall_order_id: order.id,
    refund_number: `rf-${RandomGenerator.alphaNumeric(10)}`,
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: "Shipping goodwill adjustment",
    requested_amount: requestedRefundAmount,
    approved_amount: requestedRefundAmount,
    refunded_amount: null,
    currency: paymentTransaction.currency,
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refundTransaction: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: refundTransactionBody,
    });
  typia.assert(refundTransaction);

  // 7. Create refund item without order line reference
  const componentType = "shipping";
  const refundItemGrossAmount = requestedRefundAmount;

  const refundItemBody = {
    shopping_mall_order_line_id: null,
    shopping_mall_order_seller_segment_id: null,
    component_type: componentType,
    description: "Shipping fee refund without specific order line",
    gross_amount: refundItemGrossAmount,
    tax_amount: 0,
    shipping_amount: refundItemGrossAmount,
    net_amount: refundItemGrossAmount,
  } satisfies IShoppingMallRefundItem.ICreate;

  const refundItem: IShoppingMallRefundItem =
    await api.functional.shoppingMall.platformAdmin.refundTransactions.items.create(
      connection,
      {
        refundTransactionId: refundTransaction.id,
        body: refundItemBody,
      },
    );
  typia.assert(refundItem);

  // 8. Assertions on refund item behavior
  TestValidator.equals(
    "refund item should have null order line reference",
    refundItem.shopping_mall_order_line_id ?? null,
    null,
  );

  TestValidator.equals(
    "refund item gross amount must equal requested gross",
    refundItem.gross_amount,
    refundItemGrossAmount,
  );

  TestValidator.equals(
    "refund item component_type should match",
    refundItem.component_type,
    componentType,
  );

  TestValidator.equals(
    "refund item description should persist",
    refundItem.description ?? null,
    refundItemBody.description,
  );

  TestValidator.predicate(
    "refund item gross amount must not exceed refund transaction requested_amount",
    refundItem.gross_amount <= refundTransaction.requested_amount,
  );
}
