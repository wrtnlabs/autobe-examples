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
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";

export async function test_api_platform_admin_delete_payment_status_event_with_mismatched_transaction(
  connection: api.IConnection,
) {
  // 1. Join a platform admin (actor for payment admin operations)
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Join a customer (actor for cart/order creation)
  const customerJoinBody = {
    email: `customer+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 3. As platform admin, create a brand (used for catalog context; not strictly required for payments but realistic)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. As customer, create a cart using a simple random DTO
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerAuth.ILogin,
  });

  const customerCartCreateBody =
    typia.random<IShoppingMallCustomerCart.ICreate>();
  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: customerCartCreateBody,
      },
    );
  typia.assert(customerCart);

  // Add an item into the cart with a simple random DTO
  const cartItemCreateBody =
    typia.random<IShoppingMallCustomerCartItem.ICreate>();
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 5. Create an order from the cart
  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: customerCart.currency_code,
    items_subtotal_amount: customerCart.subtotal_amount,
    discount_total_amount: customerCart.discount_amount,
    shipping_total_amount: customerCart.shipping_amount,
    tax_total_amount: customerCart.tax_amount,
    grand_total_amount: customerCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: undefined,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Switch back to platform admin for payment configuration and transactions
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      email: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallPlatformAdminLogin.IRequest,
  });

  // Create a payment method
  const now = new Date();
  const paymentMethodCreateBody = {
    code: `pm-${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Credit Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "dummy-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: now.toISOString(),
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

  // 7. Create two payment transactions for the same order
  const transactionACreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: paymentMethod.provider_key ?? "dummy-gateway",
    providerTransactionId: `txnA-${RandomGenerator.alphaNumeric(8)}`,
    currency: order.currency_code,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const transactionA: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: transactionACreateBody,
      },
    );
  typia.assert(transactionA);

  const transactionBCreateBody = {
    orderId: order.id,
    customerId: order.customer_id,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent-${RandomGenerator.alphaNumeric(8)}`,
    providerName: paymentMethod.provider_key ?? "dummy-gateway",
    providerTransactionId: `txnB-${RandomGenerator.alphaNumeric(8)}`,
    currency: order.currency_code,
    authorizedAmount: order.grand_total_amount,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const transactionB: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: transactionBCreateBody,
      },
    );
  typia.assert(transactionB);

  // 8. Create a payment status event for Transaction A
  const statusEventCreateBody = {
    previous_status: null,
    new_status: "payment_pending",
    event_type: "manual_update",
    provider_event_code: null,
    provider_reference: null,
    notes: "Initial pending status",
  } satisfies IShoppingMallPaymentStatusEvent.ICreate;

  const statusEvent: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: transactionA.id,
        body: statusEventCreateBody,
      },
    );
  typia.assert(statusEvent);

  // 9. Attempt to delete the status event using the wrong parent transaction (Transaction B)
  await TestValidator.error(
    "deleting status event under mismatched transaction should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.erase(
        connection,
        {
          paymentTransactionId: transactionB.id,
          statusEventId: statusEvent.id,
        },
      );
    },
  );

  // 10. Post-condition: ensure system is still consistent by creating new events for both transactions
  const followupStatusEventForA: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: transactionA.id,
        body: {
          previous_status: statusEvent.new_status,
          new_status: "payment_in_progress",
          event_type: "system_transition",
          provider_event_code: null,
          provider_reference: null,
          notes: "Follow-up status after failed mismatched delete",
        } satisfies IShoppingMallPaymentStatusEvent.ICreate,
      },
    );
  typia.assert(followupStatusEventForA);

  const followupStatusEventForB: IShoppingMallPaymentStatusEvent =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.statusEvents.create(
      connection,
      {
        paymentTransactionId: transactionB.id,
        body: {
          previous_status: null,
          new_status: "payment_pending",
          event_type: "manual_update",
          provider_event_code: null,
          provider_reference: null,
          notes:
            "Baseline event for Transaction B after failed mismatched delete",
        } satisfies IShoppingMallPaymentStatusEvent.ICreate,
      },
    );
  typia.assert(followupStatusEventForB);

  // Business-level sanity checks: both transactions remain correctly linked to the original order
  TestValidator.equals(
    "transaction A linked to original order",
    transactionA.orderId,
    order.id,
  );
  TestValidator.equals(
    "transaction B linked to original order",
    transactionB.orderId,
    order.id,
  );
}
