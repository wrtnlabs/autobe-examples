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
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

/**
 * Validate admin dispute detail retrieval after a full chargeback-based dispute
 * creation flow.
 *
 * 1. Join + login as admin, seller, and customer using dedicated auth endpoints.
 * 2. As admin, create core master data: country, region, shipping method, payment
 *    method, business policy and policy version, SLA config, refund reason,
 *    legal hold, and risk case.
 * 3. As seller, create a product plus a SKU inventory state and a SKU.
 * 4. As customer, create a cart, a customer address, and an order that references
 *    the cart, address, shipping method, payment method, and SKU.
 * 5. As customer, create a logical order payment for the order using the payment
 *    method.
 * 6. As admin, register a payment chargeback for the payment.
 * 7. As admin, create a refund request referencing the order, order payment,
 *    refund reason, customer, and SLA config.
 * 8. As admin, create a dispute via POST /shoppingMall/admin/disputes that
 *    references the order, refund request, chargeback, risk case, and legal
 *    hold and captures type, severity, and status.
 * 9. As admin, call GET /shoppingMall/admin/disputes/{disputeCode} and assert:
 *
 *    - Typia.assert on the response IShoppingMallDispute.
 *    - Dispute_code matches the one returned from create and the path parameter.
 *    - Linked order, refundRequest, paymentChargeback, riskCase, legalHold,
 *         ownerAdmin, and slaConfig summaries are present and have matching IDs
 *         to the created entities.
 * 10. Verify access control:
 *
 * - Using an unauthenticated connection copy (headers: {}) to call the detail
 *   endpoint should raise an error.
 * - Using a customer-authenticated connection to call the detail endpoint should
 *   also raise an error.
 */
export async function test_api_admin_dispute_detail_after_chargeback_flow(
  connection: api.IConnection,
) {
  // 1. Admin join (auto-logs in and sets admin token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Customer join (customer token applied to connection)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/home" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 3. Seller join (seller token applied to connection)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/home" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Helper: login as specific actor when needed
  const loginAsAdmin = async () => {
    const body = {
      email: adminEmail,
      password: "AdminPassw0rd!" as string & tags.Format<"password">,
      ip: null,
      href: "https://admin.shoppingmall.test/login" as string &
        tags.Format<"uri">,
      referrer: "https://admin.shoppingmall.test/home" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate;
    const admin: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.login(connection, { body });
    typia.assert(admin);
  };

  const loginAsCustomer = async () => {
    const body = {
      email: customerEmail,
      password: "CustomerPassw0rd!",
      ip: null,
      href: "https://shoppingmall.test/login" as string & tags.Format<"uri">,
      referrer: "https://shoppingmall.test/home" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest;
    const customer: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, { body });
    typia.assert(customer);
  };

  const loginAsSeller = async () => {
    const body = {
      email: sellerEmail,
      password: "SellerPassw0rd!",
      ip: null,
      href: "https://seller.shoppingmall.test/login" as string &
        tags.Format<"uri">,
      referrer: "https://seller.shoppingmall.test/home" as string &
        tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest;
    const seller: IShoppingMallSeller.IAuthorized =
      await api.functional.auth.seller.login(connection, { body });
    typia.assert(seller);
  };

  // 4. Admin: create country and region
  await loginAsAdmin();
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

  const regionCode = "SEOUL";
  const regionCreateBody = {
    code: regionCode,
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert(region);

  // 5. Admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard delivery",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 6. Admin: create payment method
  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic credit card",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 7. Admin: create business policy and policy version
  const policyCode = "DISPUTE_POLICY";
  const businessPolicyCreateBody = {
    policy_code: policyCode,
    name: "Dispute Handling Policy",
    category: "dispute",
    description: "Generic dispute policy",
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;
  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyCreateBody,
      },
    );
  typia.assert(businessPolicy);

  const policyVersionCreateBody = {
    version_code: "v1",
    title: "Initial dispute policy version",
    body_markdown: "# Dispute Policy v1",
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
        body: policyVersionCreateBody,
      },
    );
  typia.assert(policyVersion);

  // 8. Admin: create SLA config bound to policy version
  const slaConfigCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "dispute",
    actor_role: "admin",
    action_type: "resolution",
    target_duration_seconds: (48 * 60 * 60) as number & tags.Type<"int32">,
    warning_duration_seconds: (24 * 60 * 60) as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigCreateBody,
    });
  typia.assert(slaConfig);

  // 9. Admin: create refund request reason
  const refundReasonCode = "CHARGEBACK_DISPUTE";
  const refundReasonCreateBody = {
    code: refundReasonCode,
    name: "Chargeback-related refund",
    description: "Refund reason used when chargeback is involved",
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

  // 10. Admin: create legal hold
  const legalHoldCreateBody = {
    code: "DISPUTE_HOLD",
    title: "Dispute Evidence Hold",
    description: "Preserve data for dispute evidence",
    status: "active",
    scope_description: "All entities related to the test dispute",
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;
  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldCreateBody,
    });
  typia.assert(legalHold);

  // 11. Admin: create risk case
  const riskCaseCreateBody = {
    case_code: "DISPUTE_RISK_CASE",
    title: "Dispute risk investigation",
    description: "Risk case for chargeback-related dispute",
    status: "open",
    severity: "medium",
    primary_subject_type: "order",
    primary_subject_id: null,
    primary_subject_display: null,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;
  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseCreateBody,
    });
  typia.assert(riskCase);

  // 12. Seller: create product
  await loginAsSeller();
  const productCreateBody = {
    code: "DISPUTE_PROD",
    title: "Dispute Test Product",
    summary: "Product used in dispute detail test",
    description: "Detailed description for dispute test product",
    brand: "TestBrand",
    model_name: "TB-001",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/dispute-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 13. Admin: create category and link product to category
  await loginAsAdmin();
  const categoryCreateBody = {
    parent_id: null,
    slug: "dispute-test-category",
    name_en: "Dispute Test Category",
    description_en: "Category for dispute test product",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

  // 14. Admin: create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: "IN_STOCK",
    name: "In stock",
    description: "SKU is in stock and purchasable",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(skuInventoryState);

  // 15. Seller: create SKU under product
  await loginAsSeller();
  const skuCreateBody = {
    code: "DISPUTE_SKU" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 16. Customer: create cart and address, then order
  await loginAsCustomer();
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

  const addressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "1 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile("010"),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuthorized.id,
        body: addressCreateBody,
      },
    );
  typia.assert(address);

  const shippingAddressSnapshotCreateBody = {
    recipient_name: address.recipient_name,
    phone_number: address.phone_number ?? "",
    country_code: country.country_code,
    postal_code: address.postal_code,
    state_or_region: region.name_en,
    city: address.city,
    address_line1: address.line1,
    address_line2: address.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderCreateBody = {
    cart_id: orderItemCreateBody.shopping_mall_sku_id ? cart.id : cart.id,
    currency_code: "KRW",
    items: [orderItemCreateBody],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshotCreateBody,
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

  // 17. Customer: create logical payment for the order
  const paymentCreateBody = {
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
        body: paymentCreateBody,
      },
    );
  typia.assert(orderPayment);

  // 18. Admin: create payment chargeback linked to order payment
  await loginAsAdmin();
  const chargebackCreateBody = {
    currency_code: orderPayment.currency_code,
    disputed_amount: orderPayment.payable_amount,
    chargeback_amount: orderPayment.payable_amount,
    reason_code: "test_reason",
    status: "open",
    stage: "first_presentment",
    provider_reference: "CBK-TEST-001",
    metadata: "test chargeback metadata",
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id as string & tags.Format<"uuid">,
        body: chargebackCreateBody,
      },
    );
  typia.assert(chargeback);

  // 19. Admin: create refund request referencing order and payment
  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: adminAuthorized.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: orderPayment.payable_amount,
    currency_code: orderPayment.currency_code,
    reason_description: "Refund due to chargeback dispute",
    requested_by_actor_type: "admin",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestCreateBody,
    });
  typia.assert(refundRequest);

  // 20. Admin: create dispute referencing order, refund request, chargeback, risk case, and legal hold
  const disputeCode = "DISPUTE_CHARGEBACK_DETAIL";
  const disputeCreateBody = {
    dispute_code: disputeCode,
    type: "payment_chargeback",
    severity: "high",
    summary: "Chargeback-related dispute for E2E test",
    description:
      "Dispute created during E2E dispute detail test after chargeback.",
    opened_at: null,
    shopping_mall_order_id: order.id,
    shopping_mall_refund_request_id: refundRequest.id,
    shopping_mall_payment_chargeback_id: chargeback.id,
    shopping_mall_risk_case_id: riskCase.id,
  } satisfies IShoppingMallDispute.ICreate;
  const createdDispute: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.create(connection, {
      body: disputeCreateBody,
    });
  typia.assert(createdDispute);

  // 21. Admin: retrieve dispute detail by disputeCode
  const disputeDetail: IShoppingMallDispute =
    await api.functional.shoppingMall.admin.disputes.at(connection, {
      disputeCode: createdDispute.dispute_code,
    });
  typia.assert(disputeDetail);

  // 22. Business-level assertions on dispute detail
  TestValidator.equals(
    "dispute code matches between created dispute, detail, and path parameter",
    disputeDetail.dispute_code,
    createdDispute.dispute_code,
  );

  if (disputeDetail.order !== null && disputeDetail.order !== undefined) {
    TestValidator.equals(
      "linked order id in dispute matches created order",
      disputeDetail.order.id,
      order.id,
    );
  }

  if (
    disputeDetail.refundRequest !== null &&
    disputeDetail.refundRequest !== undefined
  ) {
    TestValidator.equals(
      "linked refund request id in dispute matches created refund request",
      disputeDetail.refundRequest.id,
      refundRequest.id,
    );
  }

  if (
    disputeDetail.paymentChargeback !== null &&
    disputeDetail.paymentChargeback !== undefined
  ) {
    TestValidator.equals(
      "linked payment chargeback id in dispute matches created chargeback",
      disputeDetail.paymentChargeback.id,
      chargeback.id,
    );
  }

  if (disputeDetail.riskCase !== null && disputeDetail.riskCase !== undefined) {
    TestValidator.equals(
      "linked risk case id in dispute matches created risk case",
      disputeDetail.riskCase.id,
      riskCase.id,
    );
  }

  if (
    disputeDetail.legalHold !== null &&
    disputeDetail.legalHold !== undefined
  ) {
    TestValidator.equals(
      "linked legal hold id in dispute matches created legal hold",
      disputeDetail.legalHold.id,
      legalHold.id,
    );
  }

  if (
    disputeDetail.ownerAdmin !== null &&
    disputeDetail.ownerAdmin !== undefined
  ) {
    TestValidator.equals(
      "owner admin id in dispute matches created admin",
      disputeDetail.ownerAdmin.id,
      adminAuthorized.id,
    );
  }

  if (
    disputeDetail.slaConfig !== null &&
    disputeDetail.slaConfig !== undefined
  ) {
    TestValidator.equals(
      "SLA config id in dispute matches created SLA config",
      disputeDetail.slaConfig.id,
      slaConfig.id,
    );
  }

  // 23. Access control: unauthenticated should not access dispute detail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated connection should not access dispute detail",
    async () => {
      await api.functional.shoppingMall.admin.disputes.at(unauthConnection, {
        disputeCode: createdDispute.dispute_code,
      });
    },
  );

  // 24. Access control: customer token should not access admin dispute detail
  await loginAsCustomer();
  await TestValidator.error(
    "customer-authenticated connection should not access admin dispute detail",
    async () => {
      await api.functional.shoppingMall.admin.disputes.at(connection, {
        disputeCode: createdDispute.dispute_code,
      });
    },
  );
}
