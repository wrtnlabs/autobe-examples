import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDispute";
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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_dispute_index_filter_by_core_fields(
  connection: api.IConnection,
) {
  // 1. Register admin and ensure admin authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register seller (seller will be authenticated after this call)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.local/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Register customer (customer will be authenticated after this call)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Customer!234" as string & tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.local/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 4. Switch back to admin for all admin-only master data operations
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 5. As admin, create country and region
  const countryCreateBody = typia.random<IShoppingMallCountry.ICreate>();
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert(country);

  const regionCreateBody = typia.random<IShoppingMallRegion.ICreate>();
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 6. As admin, create SKU inventory state
  const skuInventoryStateCreateBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 7. As admin, create shipping and payment methods
  const shippingMethodCreateBody =
    typia.random<IShoppingMallShippingMethod.ICreate>();
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 8. Switch to seller for product/SKU operations
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  // 9. As seller, create product and SKU
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBody: IShoppingMallSku.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 10. Switch to customer for cart/order/payment and address operations
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.local/login" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // 11. As customer, create cart
  const cartCreateBody: IShoppingMallCart.ICreate = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  // 12. As customer, create customer address
  const customerAddressCreateBody: IShoppingMallCustomerAddress.ICreate = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Test City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 13. As customer, create order with one order item
  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.code,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      },
    ],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshot,
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

  // 14. As customer, create an order payment
  const orderPaymentCreateBody: IShoppingMallOrderPayment.ICreate = {
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

  // 15. Switch back to admin for refund reasons, SLA, refund, chargeback, risk case, legal hold, disputes, and index
  const adminLoginAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAgain);

  // 16. As admin, create refund request reason
  const refundReasonCreateBody =
    typia.random<IShoppingMallRefundRequestReason.ICreate>();
  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      {
        body: refundReasonCreateBody,
      },
    );
  typia.assert(refundReason);

  // 17. As admin, create case SLA config
  const slaConfigCreateBody =
    typia.random<IShoppingMallCaseSlaConfig.ICreate>();
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigCreateBody,
    });
  typia.assert(slaConfig);

  // 18. As admin, create refund request linked to order and payment
  const refundRequestCreateBody: IShoppingMallRefundRequest.ICreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: adminAuthorized.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: "Test refund request",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestCreateBody,
    });
  typia.assert(refundRequest);

  // 19. As admin, create chargeback for the order payment
  const chargebackCreateBody: IShoppingMallPaymentChargeback.ICreate = {
    currency_code: orderPayment.currency_code,
    disputed_amount: orderPayment.payable_amount,
    chargeback_amount: orderPayment.payable_amount,
    reason_code: "FRAUD",
    status: "open",
    stage: "first_presentment",
    provider_reference: RandomGenerator.alphaNumeric(16),
    metadata: undefined,
  } satisfies IShoppingMallPaymentChargeback.ICreate;

  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackCreateBody,
      },
    );
  typia.assert(chargeback);

  // 20. As admin, create risk case
  const riskCaseCreateBody: IShoppingMallRiskCase.ICreate = {
    case_code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    status: "open",
    severity: "high",
    primary_subject_type: "order",
    primary_subject_id: order.id,
    primary_subject_display: order.order_code,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(riskCase);

  // 21. As admin, create legal hold
  const legalHoldCreateBody: IShoppingMallLegalHold.ICreate = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    status: "active",
    scope_description: "Order-related dispute test scope",
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  // 22. As admin, create multiple disputes with different combinations
  const baseDisputeType = "order_dispute";
  const otherDisputeType = "refund_dispute";
  const baseSeverity = "high";
  const otherSeverity = "low";

  const disputeCreateBodies: IShoppingMallDispute.ICreate[] = [
    {
      dispute_code: null,
      type: baseDisputeType,
      severity: baseSeverity,
      summary: "Order + refund + chargeback + risk case bound",
      description: "Primary dispute bound to all major entities",
      opened_at: null,
      shopping_mall_order_id: order.id,
      shopping_mall_refund_request_id: refundRequest.id,
      shopping_mall_payment_chargeback_id: chargeback.id,
      shopping_mall_risk_case_id: riskCase.id,
    },
    {
      dispute_code: null,
      type: otherDisputeType,
      severity: otherSeverity,
      summary: "Refund-only dispute",
      description: "Dispute bound only to refund request",
      opened_at: null,
      shopping_mall_order_id: null,
      shopping_mall_refund_request_id: refundRequest.id,
      shopping_mall_payment_chargeback_id: null,
      shopping_mall_risk_case_id: null,
    },
    {
      dispute_code: null,
      type: baseDisputeType,
      severity: otherSeverity,
      summary: "Chargeback-only dispute",
      description: "Dispute bound only to chargeback",
      opened_at: null,
      shopping_mall_order_id: null,
      shopping_mall_refund_request_id: null,
      shopping_mall_payment_chargeback_id: chargeback.id,
      shopping_mall_risk_case_id: null,
    },
    {
      dispute_code: null,
      type: otherDisputeType,
      severity: baseSeverity,
      summary: "Risk-case-only dispute",
      description: "Dispute bound only to risk case",
      opened_at: null,
      shopping_mall_order_id: null,
      shopping_mall_refund_request_id: null,
      shopping_mall_payment_chargeback_id: null,
      shopping_mall_risk_case_id: riskCase.id,
    },
  ];

  const createdDisputes: IShoppingMallDispute[] = [];
  for (const body of disputeCreateBodies) {
    const dispute: IShoppingMallDispute =
      await api.functional.shoppingMall.admin.disputes.create(connection, {
        body,
      });
    typia.assert(dispute);
    createdDisputes.push(dispute);
  }

  const primaryDispute: IShoppingMallDispute = createdDisputes[0];

  // 23. Call index with full filter set
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const fullFilterRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: requestLimit,
    status: primaryDispute.status,
    type: primaryDispute.type,
    severity: primaryDispute.severity,
    shopping_mall_order_id: primaryDispute.order_id!,
    shopping_mall_refund_request_id: primaryDispute.refund_request_id!,
    shopping_mall_payment_chargeback_id: primaryDispute.payment_chargeback_id!,
    shopping_mall_risk_case_id: primaryDispute.risk_case_id!,
    shopping_mall_admin_id: undefined,
    opened_from: undefined,
    opened_to: undefined,
    sort_field: undefined,
    sort_order: undefined,
  } satisfies IShoppingMallDispute.IRequest;

  const fullFilterPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: fullFilterRequestBody,
    });
  typia.assert(fullFilterPage);

  TestValidator.equals(
    "full filter pagination.current matches request",
    fullFilterPage.pagination.current,
    fullFilterRequestBody.page,
  );
  TestValidator.equals(
    "full filter pagination.limit matches request",
    fullFilterPage.pagination.limit,
    fullFilterRequestBody.limit,
  );

  for (const summary of fullFilterPage.data) {
    TestValidator.equals(
      "full filter: status matches",
      summary.status,
      fullFilterRequestBody.status,
    );
    TestValidator.equals(
      "full filter: type matches",
      summary.type,
      fullFilterRequestBody.type,
    );
    TestValidator.equals(
      "full filter: severity matches",
      summary.severity,
      fullFilterRequestBody.severity,
    );

    if (fullFilterRequestBody.shopping_mall_order_id !== undefined) {
      TestValidator.predicate(
        "full filter: order linkage present when filtered by order",
        summary.order !== null && summary.order !== undefined,
      );
      if (summary.order !== null && summary.order !== undefined) {
        TestValidator.equals(
          "full filter: order id matches",
          summary.order.id,
          fullFilterRequestBody.shopping_mall_order_id,
        );
      }
    }

    if (fullFilterRequestBody.shopping_mall_refund_request_id !== undefined) {
      TestValidator.predicate(
        "full filter: refundRequest linkage present when filtered by refund",
        summary.refundRequest !== null && summary.refundRequest !== undefined,
      );
      if (
        summary.refundRequest !== null &&
        summary.refundRequest !== undefined
      ) {
        TestValidator.equals(
          "full filter: refundRequest id matches",
          summary.refundRequest.id,
          fullFilterRequestBody.shopping_mall_refund_request_id,
        );
      }
    }

    if (
      fullFilterRequestBody.shopping_mall_payment_chargeback_id !== undefined
    ) {
      TestValidator.predicate(
        "full filter: paymentChargeback linkage present when filtered by chargeback",
        summary.paymentChargeback !== null &&
          summary.paymentChargeback !== undefined,
      );
      if (
        summary.paymentChargeback !== null &&
        summary.paymentChargeback !== undefined
      ) {
        TestValidator.equals(
          "full filter: paymentChargeback id matches",
          summary.paymentChargeback.id,
          fullFilterRequestBody.shopping_mall_payment_chargeback_id,
        );
      }
    }

    if (fullFilterRequestBody.shopping_mall_risk_case_id !== undefined) {
      TestValidator.predicate(
        "full filter: riskCase linkage present when filtered by riskCase",
        summary.riskCase !== null && summary.riskCase !== undefined,
      );
      if (summary.riskCase !== null && summary.riskCase !== undefined) {
        TestValidator.equals(
          "full filter: riskCase id matches",
          summary.riskCase.id,
          fullFilterRequestBody.shopping_mall_risk_case_id,
        );
      }
    }
  }

  // 24. Index with status-only filter
  const statusOnlyRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: requestLimit,
    status: primaryDispute.status,
  } satisfies IShoppingMallDispute.IRequest;

  const statusOnlyPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: statusOnlyRequestBody,
    });
  typia.assert(statusOnlyPage);

  TestValidator.predicate(
    "status-only filter should return at least one result",
    statusOnlyPage.data.length > 0,
  );

  for (const summary of statusOnlyPage.data) {
    TestValidator.equals(
      "status-only: status matches requested",
      summary.status,
      statusOnlyRequestBody.status,
    );
  }

  // 25. Index with type-only filter
  const typeOnlyRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: requestLimit,
    type: baseDisputeType,
  } satisfies IShoppingMallDispute.IRequest;

  const typeOnlyPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: typeOnlyRequestBody,
    });
  typia.assert(typeOnlyPage);

  TestValidator.predicate(
    "type-only filter should return at least one result",
    typeOnlyPage.data.length > 0,
  );

  for (const summary of typeOnlyPage.data) {
    TestValidator.equals(
      "type-only: type matches requested",
      summary.type,
      typeOnlyRequestBody.type,
    );
  }

  // 26. Index with severity-only filter
  const severityOnlyRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: requestLimit,
    severity: baseSeverity,
  } satisfies IShoppingMallDispute.IRequest;

  const severityOnlyPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: severityOnlyRequestBody,
    });
  typia.assert(severityOnlyPage);

  TestValidator.predicate(
    "severity-only filter should return at least one result",
    severityOnlyPage.data.length > 0,
  );

  for (const summary of severityOnlyPage.data) {
    TestValidator.equals(
      "severity-only: severity matches requested",
      summary.severity,
      severityOnlyRequestBody.severity,
    );
  }

  // 27. Index with order-only filter
  const orderOnlyRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: requestLimit,
    shopping_mall_order_id: order.id,
  } satisfies IShoppingMallDispute.IRequest;

  const orderOnlyPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: orderOnlyRequestBody,
    });
  typia.assert(orderOnlyPage);

  TestValidator.predicate(
    "order-only filter should return at least one result",
    orderOnlyPage.data.length > 0,
  );

  for (const summary of orderOnlyPage.data) {
    TestValidator.predicate(
      "order-only: order linkage present",
      summary.order !== null && summary.order !== undefined,
    );
    if (summary.order !== null && summary.order !== undefined) {
      TestValidator.equals(
        "order-only: order id matches requested",
        summary.order.id,
        orderOnlyRequestBody.shopping_mall_order_id,
      );
    }
  }

  // 28. Index without filters (just pagination) and ensure all created disputes are discoverable
  const unfilteredRequestBody: IShoppingMallDispute.IRequest = {
    page: requestPage,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallDispute.IRequest;

  const seenDisputeIds = new Set<string>();
  let currentPage = unfilteredRequestBody.page!;

  for (let i = 0; i < 5; i += 1) {
    const pageBody: IShoppingMallDispute.IRequest = {
      ...unfilteredRequestBody,
      page: currentPage,
    } satisfies IShoppingMallDispute.IRequest;

    const pageResult: IPageIShoppingMallDispute.ISummary =
      await api.functional.shoppingMall.admin.disputes.index(connection, {
        body: pageBody,
      });
    typia.assert(pageResult);

    for (const summary of pageResult.data) {
      seenDisputeIds.add(summary.id);
    }

    if (createdDisputes.every((d) => seenDisputeIds.has(d.id))) {
      break;
    }

    if (currentPage >= pageResult.pagination.pages) break;
    currentPage += 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  }

  TestValidator.predicate(
    "unfiltered pagination should allow discovering all created disputes",
    createdDisputes.every((d) => seenDisputeIds.has(d.id)),
  );
}
