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
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputeEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvent";
import type { IShoppingMallDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeEvidence";
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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
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

export async function test_api_admin_dispute_evidence_detail_not_found_for_other_dispute(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and implicitly gets authorized.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create minimal master data: business policy, version, SLA config, legal hold, risk case, refund reason,
  //    country, region, shipping method, payment method.
  const policyBody = {
    policy_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    category: "dispute",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: policyBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(policy);

  const policyVersionBody = {
    version_code: "v1",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: null,
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
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  const caseSlaBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "dispute",
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 24 * 60 * 60,
    warning_duration_seconds: 12 * 60 * 60,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const caseSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: caseSlaBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(caseSla);

  const legalHoldBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 2 }),
    external_reference: null,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(legalHold);

  const riskCaseBody = {
    case_code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open",
    severity: "high",
    primary_subject_type: null,
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;

  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert<IShoppingMallRiskCase>(riskCase);

  const refundReasonBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    applies_to_cancellation: true,
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
  typia.assert<IShoppingMallRefundRequestReason>(refundReason);

  const countryBody = {
    country_code: "US",
    name_en: "United States",
    phone_code: "+1",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  const regionBody = {
    code: "CA",
    name_en: "California",
    region_type: "state",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Customer joins and logs in.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.shoppingmall.test/join",
    referrer: "https://shop.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 4. Seller joins and logs in.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 5. Seller creates a product and SKU with inventory.
  const productBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  const productCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphaNumeric(10),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        description_en: null,
        status: "active",
        sort_order: 1,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert<IShoppingMallCategory>(productCategory);

  const linkBody = {
    shopping_mall_category_id: productCategory.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategoryLink);

  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  const skuBody = {
    code: RandomGenerator.alphaNumeric(10),
    barcode: null,
    status: "active",
    price: 100,
    original_price: null,
    inventory_quantity: 10,
    low_stock_threshold: 1,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 6. Customer creates shipping address.
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(),
    line1: RandomGenerator.paragraph({ sentences: 2 }),
    line2: null,
    city: "Los Angeles",
    postal_code: "90001",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(address);

  // 7. Customer creates cart, adds item, and places order.
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  const cartItemBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1,
  } satisfies IShoppingMallCartItem.ICreate;

  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const shippingAddressSnapshotBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderBody = {
    cart_id: cart.id,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: null,
    shipping_address_snapshot: shippingAddressSnapshotBody,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // 8. Customer creates a logical payment and admin creates a chargeback and refund request linked to the order.
  const paymentBody = {
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
        body: paymentBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  const chargebackBody = {
    currency_code: order.currency_code,
    disputed_amount: order.grand_total_amount,
    chargeback_amount: order.grand_total_amount,
    reason_code: "fraud",
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
        body: chargebackBody,
      },
    );
  typia.assert<IShoppingMallPaymentChargeback>(chargeback);

  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: null,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: caseSla.id,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: RandomGenerator.paragraph({ sentences: 2 }),
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert<IShoppingMallRefundRequest>(refundRequest);

  // 9. Admin creates two disputes A and B sharing the same order and context.
  const disputeABase = {
    type: "payment_chargeback",
    severity: "medium",
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    opened_at: new Date().toISOString(),
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: refundRequest.id,
    shopping_mall_payment_chargeback_id: chargeback.id,
    shopping_mall_risk_case_id: riskCase.id,
  } as const;

  const disputeABody = {
    ...disputeABase,
    dispute_code: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallDispute.ICreate;

  const disputeA: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeABody,
    });
  typia.assert<IShoppingMallDispute>(disputeA);

  const disputeBBody = {
    ...disputeABase,
    dispute_code: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallDispute.ICreate;

  const disputeB: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeBBody,
    });
  typia.assert<IShoppingMallDispute>(disputeB);

  // 10. Attach evidence E1 to dispute A and E2 to dispute B.
  const evidenceABody = {
    shopping_mall_dispute_event_id: null,
    evidence_type: "document",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    uri: "https://evidence.cdn.test/docs/e1.pdf" as string & tags.Format<"uri">,
    checksum: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallDisputeEvidence.ICreate;

  const evidenceA: IShoppingMallDisputeEvidence =
    await api.functional.shoppingMall.admin.disputes.evidences.create(
      connection,
      {
        disputeCode: disputeA.dispute_code,
        body: evidenceABody,
      },
    );
  typia.assert<IShoppingMallDisputeEvidence>(evidenceA);

  const evidenceBBody = {
    shopping_mall_dispute_event_id: null,
    evidence_type: "image",
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    uri: "https://evidence.cdn.test/images/e2.png" as string &
      tags.Format<"uri">,
    checksum: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallDisputeEvidence.ICreate;

  const evidenceB: IShoppingMallDisputeEvidence =
    await api.functional.shoppingMall.admin.disputes.evidences.create(
      connection,
      {
        disputeCode: disputeB.dispute_code,
        body: evidenceBBody,
      },
    );
  typia.assert<IShoppingMallDisputeEvidence>(evidenceB);

  // 11. Fetch each evidence via the detail endpoint and validate scoping.
  const readEvidenceA: IShoppingMallDisputeEvidence =
    await api.functional.shoppingMall.admin.disputes.evidences.at(connection, {
      disputeCode: disputeA.dispute_code,
      disputeEvidenceId: evidenceA.id,
    });
  typia.assert<IShoppingMallDisputeEvidence>(readEvidenceA);

  const readEvidenceB: IShoppingMallDisputeEvidence =
    await api.functional.shoppingMall.admin.disputes.evidences.at(connection, {
      disputeCode: disputeB.dispute_code,
      disputeEvidenceId: evidenceB.id,
    });
  typia.assert<IShoppingMallDisputeEvidence>(readEvidenceB);

  // 12. Business assertions: evidence is always returned under its owning dispute.
  TestValidator.equals(
    "evidence A belongs to dispute A",
    readEvidenceA.shopping_mall_dispute_id,
    disputeA.id,
  );

  TestValidator.equals(
    "evidence B belongs to dispute B",
    readEvidenceB.shopping_mall_dispute_id,
    disputeB.id,
  );

  TestValidator.notEquals(
    "evidence A and evidence B have different IDs",
    evidenceA.id,
    evidenceB.id,
  );

  TestValidator.notEquals(
    "dispute A and dispute B have different dispute codes",
    disputeA.dispute_code,
    disputeB.dispute_code,
  );
}
