import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvent";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Verify that dispute timeline events can only be created by authenticated
 * admin actors.
 *
 * Business goals:
 *
 * - Ensure POST /shoppingMall/admin/disputes/{disputeCode}/events rejects
 *   unauthenticated callers.
 * - Ensure the same endpoint rejects authenticated non-admin (customer) actors.
 * - Ensure an authenticated admin can successfully create a dispute event with a
 *   valid payload.
 *
 * High-level steps:
 *
 * 1. Join as an admin to establish an admin-authenticated connection.
 * 2. Create minimal admin configuration required for disputes:
 *
 *    - A country master record.
 *    - A business policy and version.
 *    - A case SLA configuration referencing the policy version.
 *    - A standardized refund request reason.
 * 3. Join as a customer to obtain a customer actor.
 * 4. Build minimal order/payment context:
 *
 *    - Create a cart for the customer.
 *    - Create a customer shipping address referencing the country.
 *    - Create a shipping method and a payment method.
 *    - Create an order using the cart, address, shipping method, and payment method.
 *    - Create a logical order payment for the order.
 * 5. As admin, create a refund request referencing the order and payment and
 *    governed by the SLA config and refund reason.
 * 6. As admin, create a dispute linked to the order and refund request, then
 *    capture its dispute_code.
 * 7. Prepare a valid dispute event payload (IShoppingMallDisputeEvent.ICreate).
 * 8. Attempt to create a dispute event with an unauthenticated connection
 *    (headers: {}), expecting an error via TestValidator.error.
 * 9. Login as customer and attempt to create a dispute event using the
 *    customer-authenticated connection, expecting an error via
 *    TestValidator.error.
 * 10. Login as admin and successfully create a dispute event using the same
 *     payload; validate the response with typia.assert and basic linkage
 *     assertions.
 */
export async function test_api_dispute_timeline_event_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1) Admin join to obtain admin-authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2) Create minimal admin config dependencies
  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const policyBody = {
    policy_code: `refund_${RandomGenerator.alphabets(8)}`,
    name: "Refund Governance Policy",
    category: "refund",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;
  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert(policy);

  const policyVersionBody = {
    version_code: "v1",
    title: "Initial Refund Policy Version",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;
  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: policy.policy_code,
        body: policyVersionBody,
      },
    );
  typia.assert(policyVersion);

  const slaBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 3600 as number & tags.Type<"int32">,
    warning_duration_seconds: 1800 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaBody,
    });
  typia.assert(slaConfig);

  const refundReasonBody = {
    code: `damaged_${RandomGenerator.alphabets(6)}`,
    name: "Item arrived damaged",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: refundReasonBody,
      },
    );
  typia.assert(refundReason);

  // 3) Customer join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4) Build minimal order context
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  const customerAddressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: null,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Testville",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressBody,
      },
    );
  typia.assert(customerAddress);

  const shippingMethodBody = {
    method_code: `ground_${RandomGenerator.alphabets(4)}`,
    display_name: "Ground Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `card_${RandomGenerator.alphabets(4)}`,
    display_name: "Credit Card",
    description: "Standard credit card",
    provider_type: "card_processor",
    allowed_currencies: "USD",
    allowed_countries: "US",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
        quantity: 1 as number & tags.Type<"int32">,
      },
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: order.grand_total_amount,
    provider_reference: null,
    provider_status_code: null,
    metadata: null,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const orderPayment: IShoppingMallOrderPayment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: orderPaymentBody,
      },
    );
  typia.assert(orderPayment);

  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: null,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: orderPayment.payable_amount,
    currency_code: orderPayment.currency_code,
    reason_description: RandomGenerator.paragraph({ sentences: 3 }),
    requested_by_actor_type: "customer",
    requires_return: true,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert(refundRequest);

  const disputeBody = {
    dispute_code: null,
    type: "refund_dispute",
    severity: "medium",
    summary: "Customer refund dispute",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    opened_at: new Date().toISOString(),
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: refundRequest.id,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;
  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeBody,
    });
  typia.assert(dispute);

  const eventBody = {
    event_type: "note_added",
    status_before: dispute.status,
    status_after: dispute.status,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallDisputeEvent.ICreate;

  // 8) Unauthenticated attempt: clone connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "dispute event creation must fail without auth",
    async () => {
      await api.functional.shoppingMall.admin.disputes.events.create(
        unauthConn,
        {
          disputeCode: dispute.dispute_code,
          body: eventBody,
        },
      );
    },
  );

  // 9) Customer-authenticated attempt
  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.local/login",
    referrer: "https://shoppingmall.local/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const reloggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(reloggedCustomer);

  await TestValidator.error(
    "dispute event creation must fail for customer actor",
    async () => {
      await api.functional.shoppingMall.admin.disputes.events.create(
        connection,
        {
          disputeCode: dispute.dispute_code,
          body: eventBody,
        },
      );
    },
  );

  // 10) Admin-authenticated success: ensure admin login fresh then create event
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const reloggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  const createdEvent: IShoppingMallDisputeEvent =
    await api.functional.shoppingMall.admin.disputes.events.create(connection, {
      disputeCode: dispute.dispute_code,
      body: eventBody,
    });
  typia.assert(createdEvent);

  TestValidator.predicate(
    "created dispute event should reference parent dispute",
    createdEvent.dispute !== undefined && createdEvent.dispute !== null,
  );

  TestValidator.equals(
    "created dispute event is linked to correct dispute code",
    createdEvent.dispute?.dispute_code,
    dispute.dispute_code,
  );
}
