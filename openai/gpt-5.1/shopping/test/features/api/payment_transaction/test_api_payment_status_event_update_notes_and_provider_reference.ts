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
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusEvent";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

/**
 * Verify that a platformAdmin can update mutable fields of a payment status
 * event without changing immutable identifiers or the core status information.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create a payment method configuration.
 * 3. Register and authenticate a seller, then create a product under that seller.
 * 4. As platform admin, create a SKU for the product (using the product code).
 * 5. As seller, create an inventory item for the SKU to make it purchasable.
 * 6. Register and authenticate a customer, then create a customer cart.
 * 7. As customer, add the SKU as a cart item, then create an order from the cart.
 * 8. As platform admin, create a payment transaction for the order with an initial
 *    status.
 * 9. As platform admin, create an initial payment status event (e.g. authorized ->
 *    captured).
 * 10. Call PUT statusEvents.update to modify only notes and provider_reference (and
 *     optionally provider_event_code).
 * 11. Assert response reflects updated mutable fields but preserves id,
 *     payment_transaction_id, created_at, and new_status.
 */
export async function test_api_payment_status_event_update_notes_and_provider_reference(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure subsequent calls use admin token (SDK already updated connection.headers)

  // 2. Create a payment method configuration as platform admin
  const paymentMethodCode = `pm_${RandomGenerator.alphaNumeric(8)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Test Credit Card",
    description: "Test payment method for E2E",
    provider_key: "test_provider",
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

  // 3. Register and authenticate a seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 4. As platform admin, create a brand and a product under the seller
  // Switch back to platform admin (login)
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;
  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const brandBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: "E2E Brand",
    logo_uri: "https://cdn.shoppingmall.local/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prd_${RandomGenerator.alphaNumeric(8)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "E2E Test Product" as string & tags.MinLength<1>,
    short_description: "Short description",
    description: "Longer description for E2E product",
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.local/product.png",
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

  // 5. Create a SKU variant for the product
  const skuCode = `sku_${RandomGenerator.alphaNumeric(8)}`;
  const skuBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice: 10000,
    salePrice: 9500,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 6. As seller, create an inventory item for the SKU
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: "127.0.0.1",
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 5 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 7. Register and authenticate a customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.shoppingmall.local/join",
    referrer: "https://shop.shoppingmall.local/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 8. Create a customer cart as customer
  const cartBody = {
    currency_code: "KRW",
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

  // 9. Add SKU as cart item
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

  // 10. Create an order from the cart
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: cart.subtotal_amount,
    discount_total_amount: cart.discount_amount,
    shipping_total_amount: cart.shipping_amount,
    tax_total_amount: cart.tax_amount,
    grand_total_amount: cart.total_amount,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 11. As platform admin, create a payment transaction for the order
  const adminLoginAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  const transactionBody = {
    orderId: order.id,
    customerId: customerAuthorized.id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(10)}`,
    providerName: paymentMethod.provider_key ?? "test_provider",
    providerTransactionId: `ptxn_${RandomGenerator.alphaNumeric(12)}`,
    currency: order.currency_code as string &
      tags.MinLength<3> &
      tags.MaxLength<3>,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: null,
    paymentStatus: "payment_authorized",
    providerStatus: "authorized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const transaction: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: transactionBody,
      },
    );
  typia.assert(transaction);

  // 12. Create an initial payment status event for the transaction
  const initialEventBody = {
    previous_status: transaction.paymentStatus,
    new_status: "payment_captured",
    event_type: "system_transition",
    provider_event_code: "AUTH_TO_CAPTURE",
    provider_reference: `evt_${RandomGenerator.alphaNumeric(10)}`,
    notes: "Initial capture event",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const initialEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: transaction.id,
        body: initialEventBody,
      },
    );
  typia.assert(initialEvent);

  // 13. Update mutable fields of the status event (notes and provider_reference)
  const updatedNotes = "Updated notes for E2E";
  const updatedProviderRef = `evt_${RandomGenerator.alphaNumeric(12)}`;
  const updatedProviderCode = "CAPTURE_CONFIRMED";

  const updateBody = {
    previous_status: initialEvent.previous_status ?? null,
    new_status: initialEvent.new_status,
    event_type: initialEvent.event_type,
    provider_event_code: updatedProviderCode,
    provider_reference: updatedProviderRef,
    notes: updatedNotes,
  } satisfies IShoppingMallPaymentStatusEvent.IUpdate;

  const updatedEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.update(
      connection,
      {
        paymentTransactionId: transaction.id,
        statusEventId: initialEvent.id,
        body: updateBody,
      },
    );
  typia.assert(updatedEvent);

  // 14. Business assertions
  TestValidator.equals(
    "status event id remains unchanged",
    updatedEvent.id,
    initialEvent.id,
  );

  TestValidator.equals(
    "payment_transaction_id remains unchanged",
    updatedEvent.payment_transaction_id,
    initialEvent.payment_transaction_id,
  );

  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedEvent.created_at,
    initialEvent.created_at,
  );

  TestValidator.equals(
    "new_status remains unchanged",
    updatedEvent.new_status,
    initialEvent.new_status,
  );

  TestValidator.equals(
    "previous_status remains consistent",
    updatedEvent.previous_status ?? null,
    initialEvent.previous_status ?? null,
  );

  TestValidator.equals(
    "event_type remains unchanged",
    updatedEvent.event_type,
    initialEvent.event_type,
  );

  TestValidator.equals(
    "notes field updated correctly",
    updatedEvent.notes ?? null,
    updatedNotes,
  );

  TestValidator.equals(
    "provider_reference updated correctly",
    updatedEvent.provider_reference ?? null,
    updatedProviderRef,
  );

  TestValidator.equals(
    "provider_event_code updated correctly",
    updatedEvent.provider_event_code ?? null,
    updatedProviderCode,
  );
}
