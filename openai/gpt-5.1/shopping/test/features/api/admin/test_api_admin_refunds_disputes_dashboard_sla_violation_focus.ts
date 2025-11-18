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
import type { IShoppingMallCaseSlaSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaSummary";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDashboardPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboardPeriod";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallDisputesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputesSummary";
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
import type { IShoppingMallRefundsAndDisputesDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsAndDisputesDashboard";
import type { IShoppingMallRefundsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundsSummary";
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
import type { IShoppingMallTopRefundReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTopRefundReason";

export async function test_api_admin_refunds_disputes_dashboard_sla_violation_focus(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // ensure admin login also works and refreshes Authorization header
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Business policy and version for refund SLAs
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(8)}`;

  const businessPolicyBody = {
    policy_code: policyCode,
    name: "Refund Policy for SLA Dashboard",
    category: "refund",
    description: "Policy used in SLA-focused refund dashboard test.",
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      { body: businessPolicyBody },
    );
  typia.assert(businessPolicy);

  const policyVersionBody = {
    version_code: "v1",
    title: "Refund Policy v1",
    body_markdown: "# Refund Policy v1\nThis is a test policy for SLA.",
    parameters_json: null,
    status: "active",
    effective_from: null,
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersion: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode: businessPolicy.policy_code,
        body: policyVersionBody,
      },
    );
  typia.assert(policyVersion);

  // 3. Case SLA configuration for refund cases
  const slaConfigBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "admin",
    action_type: "final_decision",
    target_duration_seconds: 60,
    warning_duration_seconds: 30,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigBody,
    });
  typia.assert(slaConfig);

  // 4. Refund reason master
  const refundReasonBody = {
    code: `reason_${RandomGenerator.alphaNumeric(6)}`,
    name: "Test SLA Refund Reason",
    description: "Reason used to drive refund dashboards in tests.",
    applies_to_cancellation: false,
    applies_to_refund: true,
    is_active: true,
  } satisfies IShoppingMallRefundRequestReason.ICreate;

  const refundReason: IShoppingMallRefundRequestReason =
    await api.functional.shoppingMall.admin.refundRequestReasons.create(
      connection,
      { body: refundReasonBody },
    );
  typia.assert(refundReason);

  // 5. Seller onboarding and catalog setup
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // create inventory state (admin context, re-login admin to reset token)
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  const inventoryStateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable inventory state for SLA tests.",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  const categoryBody = {
    parent_id: null,
    slug: `sla-test-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "SLA Test Category",
    description_en: "Category used for SLA dashboard product tests.",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // switch to seller to create product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const productBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(6)}`,
    title: "SLA Dashboard Test Product",
    summary: "Product for refund SLA dashboard flow.",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "SLA-Test-Brand",
    model_name: "Model-A",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/sla-product.png" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // associate product with category (admin context)
  const adminAfterProduct: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterProduct);

  const productCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryBody,
      },
    );
  typia.assert(productCategory);

  // switch back to seller to create SKU
  const sellerAfterCategory: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAfterCategory);

  const skuBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(5)}`,
    barcode: null,
    status: "active",
    price: 100,
    original_price: 120,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuBody,
    });
  typia.assert(sku);

  // 6. Customer onboarding & address & cart & order & payment
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  // admin creates country and region
  const adminBeforeGeo: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminBeforeGeo);

  const countryCode = RandomGenerator.alphaNumeric(2).toUpperCase();
  const countryBody = {
    country_code: countryCode,
    name_en: "SLA Test Country",
    phone_code: "+999",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCountry.ICreate;

  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryBody,
    });
  typia.assert(country);

  const regionBody = {
    code: "REG-1",
    name_en: "SLA Test Region",
    region_type: "state",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionBody,
      },
    );
  typia.assert(region);

  // customer login to ensure context
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "SLA Test Customer",
    line1: "123 SLA Street",
    line2: null,
    city: "SLA City",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLoggedIn.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // create a cart (not strictly used for order, but validates cart flow)
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

  // admin creates shipping & payment methods
  const adminBeforeMethods: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminBeforeMethods);

  const shippingMethodBody = {
    method_code: `ship_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "SLA Test Shipping",
    service_level_description: "Test shipping method for SLA scenario.",
  } satisfies IShoppingMallShippingMethod.ICreate;

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: `pay_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "SLA Test Payment",
    description: "Test payment method for SLA scenario.",
    provider_type: "test_provider",
    allowed_currencies: "USD",
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // switch back to customer to create order and payment
  const customerAfterMethods: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAfterMethods);

  const orderBody = {
    cart_id: null,
    currency_code: "USD",
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
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

  const payableAmount = 100;
  const orderPaymentBody = {
    payment_method_id: paymentMethod.id,
    currency_code: order.currency_code,
    payable_amount: payableAmount,
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

  // 7. Create refund request tied to order, payment, and SLA config (admin context)
  const adminBeforeRefund: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminBeforeRefund);

  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerLoggedIn.id,
    shopping_mall_seller_id: sellerLoggedIn.id,
    shopping_mall_admin_id: admin.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: payableAmount,
    currency_code: order.currency_code,
    reason_description: "SLA dashboard test refund request.",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert(refundRequest);

  TestValidator.equals(
    "refund request links to order",
    refundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund request currency matches order",
    refundRequest.currency_code,
    order.currency_code,
  );

  // 8. Call refunds & disputes dashboard as admin
  const adminBeforeDashboard: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminBeforeDashboard);

  const dashboard: IShoppingMallRefundsAndDisputesDashboard =
    await api.functional.shoppingMall.admin.refundsAndDisputes.dashboard.index(
      connection,
    );
  typia.assert(dashboard);

  const period: IShoppingMallDashboardPeriod = dashboard.period;
  typia.assert(period);

  const refundSummary: IShoppingMallRefundsSummary = dashboard.refundSummary;
  typia.assert(refundSummary);

  const disputeSummary: IShoppingMallDisputesSummary = dashboard.disputeSummary;
  typia.assert(disputeSummary);

  const slaSummary: IShoppingMallCaseSlaSummary = dashboard.slaSummary;
  typia.assert(slaSummary);

  const topReasons: IShoppingMallTopRefundReason[] = dashboard.topRefundReasons;
  dashboard.recentRefundRequests.forEach((r) => typia.assert(r));
  dashboard.recentDisputes.forEach((d) => typia.assert(d));

  // 9. SLA summary logical validations
  TestValidator.predicate(
    "total violation count non-negative",
    slaSummary.total_violation_count >= 0,
  );
  TestValidator.predicate(
    "cancellation violation count non-negative",
    slaSummary.cancellation_violation_count >= 0,
  );
  TestValidator.predicate(
    "refund violation count non-negative",
    slaSummary.refund_violation_count >= 0,
  );
  TestValidator.predicate(
    "dispute violation count non-negative",
    slaSummary.dispute_violation_count >= 0,
  );

  TestValidator.predicate(
    "total violations cover refund violations",
    slaSummary.total_violation_count >= slaSummary.refund_violation_count,
  );
  TestValidator.predicate(
    "total violations cover cancellation violations",
    slaSummary.total_violation_count >= slaSummary.cancellation_violation_count,
  );
  TestValidator.predicate(
    "total violations cover dispute violations",
    slaSummary.total_violation_count >= slaSummary.dispute_violation_count,
  );

  // 10. Refund summary logical validations
  TestValidator.predicate(
    "refund request count non-negative",
    refundSummary.refund_request_count >= 0,
  );
  TestValidator.predicate(
    "approved refund request count non-negative",
    refundSummary.approved_refund_request_count >= 0,
  );
  TestValidator.predicate(
    "rejected refund request count non-negative",
    refundSummary.rejected_refund_request_count >= 0,
  );
  TestValidator.predicate(
    "refunded amount non-negative",
    refundSummary.refunded_amount >= 0,
  );
  TestValidator.predicate(
    "partial refund count non-negative",
    refundSummary.partial_refund_count >= 0,
  );
  TestValidator.predicate(
    "full refund count non-negative",
    refundSummary.full_refund_count >= 0,
  );
  TestValidator.predicate(
    "average refund resolution time non-negative",
    refundSummary.average_refund_resolution_time_hours >= 0,
  );

  // 11. Dispute summary logical validations
  TestValidator.predicate(
    "dispute opened count non-negative",
    disputeSummary.dispute_opened_count >= 0,
  );
  TestValidator.predicate(
    "dispute resolved count non-negative",
    disputeSummary.dispute_resolved_count >= 0,
  );
  TestValidator.predicate(
    "dispute resolved for customer count non-negative",
    disputeSummary.dispute_resolved_for_customer_count >= 0,
  );
  TestValidator.predicate(
    "dispute resolved for seller count non-negative",
    disputeSummary.dispute_resolved_for_seller_count >= 0,
  );
  TestValidator.predicate(
    "average dispute resolution time non-negative",
    disputeSummary.average_dispute_resolution_time_hours >= 0,
  );

  // 12. Recent refund requests sanity checks
  TestValidator.predicate(
    "recentRefundRequests array exists",
    Array.isArray(dashboard.recentRefundRequests),
  );

  if (dashboard.recentRefundRequests.length > 0) {
    const firstRefund: IShoppingMallRefundRequest.ISummary =
      dashboard.recentRefundRequests[0];
    TestValidator.predicate(
      "recent refund requested amount non-negative",
      firstRefund.requested_total_amount >= 0,
    );
    TestValidator.predicate(
      "recent refund currency non-empty",
      firstRefund.currency_code.length > 0,
    );
  }

  // 13. Recent disputes sanity checks (may be empty)
  TestValidator.predicate(
    "recentDisputes array exists",
    Array.isArray(dashboard.recentDisputes),
  );

  // 14. Top refund reasons array sanity
  TestValidator.predicate(
    "topRefundReasons array exists",
    Array.isArray(topReasons),
  );
  topReasons.forEach((reason, index) => {
    TestValidator.predicate(
      `topRefundReason[${index}] request_count non-negative`,
      reason.request_count >= 0,
    );
  });
}
