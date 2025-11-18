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
 * Validate that dispute event detail endpoint returns the correct event when a
 * dispute has multiple events.
 *
 * Business flow (adapted to available APIs/DTOs):
 *
 * 1. Admin joins the platform and becomes authenticated.
 * 2. Admin configures minimal master data required for an order + refund + dispute
 *    context:
 *
 *    - Country master
 *    - Business policy and a policy version
 *    - Case SLA config bound to that policy version
 *    - Shipping method
 *    - Payment method
 * 3. A customer joins and authenticates.
 * 4. Customer creates:
 *
 *    - A cart header
 *    - An order referencing an inline shipping address snapshot
 *    - A payment for that order referencing the created payment method
 * 5. Admin (re-authenticated) creates a refund reason and a refund request for the
 *    order using the SLA config.
 * 6. Admin opens a dispute linked to the order and refund request.
 * 7. Admin appends three dispute events with distinct event_type and
 *    status_before/status_after.
 * 8. For each created event, admin calls GET
 *    /shoppingMall/admin/disputes/{disputeCode}/events/{disputeEventId}.
 * 9. Assertions per event:
 *
 *    - Typia.assert validates IShoppingMallDisputeEvent shape.
 *    - Id from GET matches the created event id.
 *    - Event_type, status_before, status_after match the original creation payload.
 *    - Occurred_at matches the timestamp passed at creation.
 *    - Created_at and updated_at are valid ISO date-time strings.
 *    - Each GET returns the targeted event independent of the others.
 */
export async function test_api_dispute_event_detail_for_dispute_with_multiple_events(
  connection: api.IConnection,
) {
  // 1. Admin joins (auto-auth via SDK)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Master data: country
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea, Republic of",
    phone_code: "+82",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  // 2-1. Business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;
  const policyCreateBody = {
    policy_code: policyCode,
    name: "Standard Refund Policy",
    category: "refund",
    description: "Standard refund rules for disputes",
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;
  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyCreateBody,
      },
    );
  typia.assert(businessPolicy);

  // 2-2. Policy version
  const policyVersionCreateBody = {
    version_code: "v1",
    title: "Initial Refund Policy Version",
    body_markdown: "# Refund Policy\nThis is the initial version.",
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;
  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);

  // 2-3. Case SLA config bound to policy version
  const slaConfigCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "admin",
    action_type: "decision",
    target_duration_seconds: 86400 as number & tags.Type<"int32">,
    warning_duration_seconds: 43200 as
      | (number & tags.Type<"int32">)
      | null
      | undefined,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigCreateBody,
    });
  typia.assert(slaConfig);

  // 2-4. Shipping method
  const shippingMethodCreateBody = {
    method_code: `std_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method for e2e tests",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 2-5. Payment method
  const paymentMethodCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card",
    description: "Card payment for tests",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 3. Customer joins and logs in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const joinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shoppingmall.local/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customerAuthorized);

  const loginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://shoppingmall.local/login" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const loggedInCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInCustomer);

  // 4. Customer creates a cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 4-1. Create order from cart with inline shipping address snapshot
  const shippingSnapshotCreateBody = {
    recipient_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: "06236",
    state_or_region: "Seoul",
    city: "Gangnam-gu",
    address_line1: "Teheran-ro 123",
    address_line2: null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string & tags.Format<"uuid">,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreate],
    shipping_address_id: null,
    shipping_address_snapshot: shippingSnapshotCreateBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4-2. Create payment for the order
  const orderPaymentCreateBody = {
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
        body: orderPaymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // Re-authenticate as admin before admin-only flows
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shoppingmall.local/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Admin creates refund reason and refund request
  const refundReasonCreateBody = {
    code: `reason_${RandomGenerator.alphaNumeric(6)}`,
    name: "E2E Test Reason",
    description: "Reason for e2e refund request",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;
  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: refundReasonCreateBody,
      },
    );
  typia.assert(refundReason);

  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: order.customer
      ? order.customer.id
      : loggedInCustomer.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: adminLoggedIn.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: "E2E refund request for dispute context",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestCreateBody,
    });
  typia.assert(refundRequest);

  // 6. Admin opens a dispute linked to the order and refund request
  const disputeCode = `DSP-${RandomGenerator.alphaNumeric(10)}`;
  const disputeCreateBody = {
    dispute_code: disputeCode,
    type: "refund_dispute",
    severity: "medium",
    summary: "E2E dispute for event detail testing",
    description: "Dispute opened for testing GET dispute event details.",
    opened_at: new Date().toISOString() as string & tags.Format<"date-time">,
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: refundRequest.id,
    shopping_mall_payment_chargeback_id: null,
    shopping_mall_risk_case_id: null,
  } satisfies IShoppingMallDispute.ICreate;
  const dispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreateBody,
    });
  typia.assert(dispute);

  // 7. Admin appends three dispute events (distinct event_type and statuses)
  const baseOccurredAt = new Date();

  const eventPayloads: IShoppingMallDisputeEvent.ICreate[] = [
    {
      event_type: "created",
      status_before: null,
      status_after: "open",
      description: "Dispute created for testing.",
      occurred_at: baseOccurredAt.toISOString() as string &
        tags.Format<"date-time">,
    },
    {
      event_type: "note_added",
      status_before: "open",
      status_after: "open",
      description: "Admin added a note to the dispute.",
      occurred_at: new Date(
        baseOccurredAt.getTime() + 60_000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      event_type: "status_changed",
      status_before: "open",
      status_after: "under_investigation",
      description: "Dispute moved to investigation.",
      occurred_at: new Date(
        baseOccurredAt.getTime() + 120_000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
  ];

  const createdEvents: IShoppingMallDisputeEvent[] = [];

  for (const payload of eventPayloads) {
    const created =
      await api.functional.shoppingMall.admin.disputes.events.create(
        connection,
        {
          disputeCode: dispute.dispute_code,
          body: payload,
        },
      );
    typia.assert(created);
    createdEvents.push(created);
  }

  TestValidator.equals(
    "three dispute events should be created",
    createdEvents.length,
    eventPayloads.length,
  );

  // 8 & 9. For each created event, fetch by (disputeCode, eventId) and validate
  for (let index = 0; index < createdEvents.length; index++) {
    const created = createdEvents[index];
    const payload = eventPayloads[index];

    const fetched: IShoppingMallDisputeEvent =
      await api.functional.shoppingMall.admin.disputes.events.at(connection, {
        disputeCode: dispute.dispute_code,
        disputeEventId: created.id,
      });
    typia.assert(fetched);

    // Basic identity and mapping checks
    TestValidator.equals(
      `event ${index} id matches between create and fetch`,
      fetched.id,
      created.id,
    );
    TestValidator.equals(
      `event ${index} event_type matches payload`,
      fetched.event_type,
      payload.event_type,
    );
    TestValidator.equals(
      `event ${index} status_before matches payload`,
      fetched.status_before ?? null,
      payload.status_before ?? null,
    );
    TestValidator.equals(
      `event ${index} status_after matches payload`,
      fetched.status_after ?? null,
      payload.status_after ?? null,
    );
    TestValidator.equals(
      `event ${index} occurred_at matches payload`,
      fetched.occurred_at,
      payload.occurred_at,
    );

    // Each event is bound to the same dispute code when dispute summary is present
    if (fetched.dispute) {
      TestValidator.equals(
        `event ${index} belongs to the same dispute code`,
        fetched.dispute.dispute_code,
        dispute.dispute_code,
      );
    }

    // created_at / updated_at are valid date-time strings
    TestValidator.predicate(
      `event ${index} created_at is a valid ISO date-time`,
      () =>
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T/.test(
          fetched.created_at,
        ),
    );
    TestValidator.predicate(
      `event ${index} updated_at is a valid ISO date-time`,
      () =>
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T/.test(
          fetched.updated_at,
        ),
    );
  }
}
