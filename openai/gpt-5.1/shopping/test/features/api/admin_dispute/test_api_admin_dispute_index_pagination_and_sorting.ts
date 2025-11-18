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

/**
 * Validate admin dispute index pagination and sorting behavior.
 *
 * ## Business context
 *
 * The ShoppingMall backend exposes an admin-only dispute search endpoint PATCH
 * /shoppingMall/admin/disputes that accepts an IShoppingMallDispute.IRequest
 * body and returns a paginated IPageIShoppingMallDispute.ISummary result.
 * Admins use this endpoint to build dispute work queues and dashboards and rely
 * on predictable pagination and sorting semantics when navigating through large
 * sets of disputes.
 *
 * This test exercises that endpoint by:
 *
 * - Authenticating as an admin actor.
 * - Seeding a sufficiently large number of disputes (>= 25) with controlled
 *   combinations of opened_at, severity, and status values.
 * - Querying the index endpoint with page/limit and different sort
 *   configurations.
 * - Verifying page metadata and data length.
 * - Verifying non-overlapping pages when traversing page 1 and 2.
 * - Verifying global ordering semantics for opened_at, severity, and status sort
 *   fields.
 * - Avoiding any type-error or schema-violation scenarios: all requests must be
 *   valid according to IShoppingMallDispute.IRequest.
 *
 * ## High-level flow
 *
 * 1. Admin authentication
 *
 *    - Call POST /auth/admin/join to create an admin and obtain tokens
 *         (api.functional.auth.admin.join).
 * 2. Seed minimal master data that disputes may reference
 *
 *    - Create a country and a region so that later customer addresses can reference
 *         valid geography.
 *    - Create a SKU inventory state so that SKUs can be created.
 *    - Create one shipping method and one payment method so that orders and payments
 *         can be created.
 * 3. Create a seller and product catalog context
 *
 *    - Seller join via /auth/seller/join and login so that seller product creation
 *         is authorized.
 *    - Create a product via /shoppingMall/seller/products.
 *    - Create a SKU under that product via
 *         /shoppingMall/seller/products/{productId}/skus.
 * 4. Create a customer and basic shopping flow
 *
 *    - Customer join via /auth/customer/join and login.
 *    - Create a customer address referencing the created country & region.
 *    - Create a cart for the customer.
 *    - Create a single order that references the SKU, address, shipping method, and
 *         payment method.
 *    - Create one order payment via
 *         /shoppingMall/customer/orders/{orderId}/payments.
 * 5. Seed risk, legal, SLA, refund reasons and refund requests
 *
 *    - As admin:
 *
 *         - Create a refund request reason.
 *         - Create a case SLA config.
 *         - Create a legal hold.
 *         - Create a risk case.
 *         - Create a refund request linked to the order and refund reason/SLA.
 *         - Create a payment chargeback linked to the order payment.
 * 6. Create a batch of disputes
 *
 *    - Still as admin, call /shoppingMall/admin/disputes (create) multiple times to
 *         generate at least 25–30 disputes.
 *    - For each dispute, vary these fields in a deterministic but simple pattern so
 *         that ordering can be asserted:
 *
 *         - Severity: cycle through ["low", "medium", "high"]
 *         - Status: cycle through ["open", "under_investigation", "closed"]
 *         - Type: use a small set like ["payment_chargeback", "refund_dispute",
 *                   "policy_violation"].
 *         - Opened_at: use monotonically increasing timestamps, e.g. baseTime + i
 *                   minutes, so that sort by opened_at is well defined.
 *    - Also, associate some disputes with the previously created order, refund
 *         request, payment chargeback, risk case, and legal hold via the
 *         corresponding *_id properties to ensure realistic linkages, while
 *         others may omit those links (null).
 * 7. Test pagination + sort by opened_at desc
 *
 *    - Call PATCH /shoppingMall/admin/disputes with body: { page: 1, limit: 10,
 *         sort_field: "opened_at", sort_order: "desc" }.
 *    - Assert:
 *
 *         - Pagination.current === 1
 *         - Pagination.limit === 10
 *         - Data.length === 10 (assuming we created >= 20 disputes)
 *         - Data is sorted by opened_at in descending order.
 *    - Call again with page: 2, same limit and sort, and assert:
 *
 *         - Pagination.current === 2
 *         - Data.length is 10 (when >= 20 disputes)
 *         - No dispute_code overlap with page 1
 *         - Combined data from pages 1 and 2 is still strictly sorted by opened_at desc.
 * 8. Test sort by severity and status
 *
 *    - Call index with { page: 1, limit: 20, sort_field: "severity", sort_order:
 *         "asc" } and assert that the results are grouped and ordered according
 *         to string ascending order of severity.
 *    - Call index with { page: 1, limit: 20, sort_field: "status", sort_order: "asc"
 *         } and assert that results follow lexicographical ordering by status.
 *    - For both, only validate ordering consistency with the returned page; no
 *         assumptions about backend’s severity / status semantic ranking are
 *         made beyond simple string compare.
 * 9. Do NOT send invalid page/limit combinations
 *
 *    - The scenario draft mentions testing invalid page/limit values like 0 or
 *         negative numbers. However, IShoppingMallDispute.IRequest types
 *         enforce minimum 1 for page and limit, so such payloads cannot be
 *         expressed without violating the DTO type.
 *    - To keep the test compilable and type-safe, we intentionally skip any
 *         invalid-type or invalid-range requests. All bodies must satisfy
 *         IShoppingMallDispute.IRequest and we avoid any negative or zero
 *         values.
 */
export async function test_api_admin_dispute_index_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join and token acquisition
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seed country & region
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

  const regionCreateBody = {
    code: "SEOUL",
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

  // 3. Seed SKU inventory state
  const inventoryStateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Standard sellable inventory",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: inventoryStateBody },
    );
  typia.assert(inventoryState);

  // 4. Seed shipping & payment methods
  const shippingMethodBody = {
    method_code: "standard",
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodBody = {
    code: "card",
    display_name: "Credit Card",
    description: "Generic card payments",
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
  typia.assert(paymentMethod);

  // 5. Seller join & login
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login",
    referrer: "https://seller.shoppingmall.test/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 6. Create product & SKU as seller
  const productBody = {
    code: "PROD-DISPUTE-TEST",
    title: "Dispute Test Product",
    summary: "Product used for dispute pagination E2E tests",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/prod-dispute-test.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  const skuBody = {
    code: "SKU-DISPUTE-001" as string & tags.MinLength<1> & tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 100 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
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

  // 7. Customer join & login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.shoppingmall.test/join",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.test/login",
    referrer: "https://customer.shoppingmall.test/",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 8. Create a customer address
  const addressBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: "Suite 456",
    city: "Seoul",
    postal_code: "04524",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: addressBody,
      },
    );
  typia.assert(address);

  // 9. Create a cart
  const cartBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartBody,
    });
  typia.assert(cart);

  // 10. Create an order
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

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

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: "KRW",
    items: [orderItemCreate],
    shipping_address_id: address.id,
    shipping_address_snapshot: shippingAddressSnapshotBody,
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

  // 11. Create an order payment
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

  // 12. Switch back to admin context (login) to create governance data & disputes
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 13. Create refund reason
  const refundReasonBody = {
    code: "DEFECTIVE_ITEM",
    name: "Defective item",
    description: "Item arrived damaged or malfunctioning",
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

  // 14. Create SLA config
  const slaConfigBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: "dispute",
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 3600 as number & tags.Type<"int32">,
    warning_duration_seconds: 1800 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;
  const slaConfig: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigBody,
    });
  typia.assert(slaConfig);

  // 15. Create legal hold
  const legalHoldBody = {
    code: "LH-DISPUTE-TEST",
    title: "Dispute test legal hold",
    description: "Legal hold for dispute E2E test data",
    status: "active",
    scope_description: "Covers dispute E2E test records",
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;
  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 16. Create risk case
  const riskCaseBody = {
    case_code: "RISK-DISPUTE-TEST",
    title: "Risk case for dispute tests",
    description: "Risk context for dispute E2E test",
    status: "open",
    severity: "medium",
    primary_subject_type: "order",
    primary_subject_id: order.id,
    primary_subject_display: order.order_code,
    sla_due_at: null,
  } satisfies IShoppingMallRiskCase.ICreate;
  const riskCase: IShoppingMallRiskCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: riskCaseBody,
    });
  typia.assert(riskCase);

  // 17. Create refund request
  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_admin_id: adminLogin.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: slaConfig.id,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: "Customer reported defective item for dispute test",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestBody,
    });
  typia.assert(refundRequest);

  // 18. Create chargeback
  const chargebackBody = {
    currency_code: order.currency_code,
    disputed_amount: order.grand_total_amount,
    chargeback_amount: 0,
    reason_code: "FRAUD",
    status: "open",
    stage: "first_presentment",
    provider_reference: "CB-DISPUTE-TEST",
    metadata: "Initial chargeback for dispute E2E test",
  } satisfies IShoppingMallPaymentChargeback.ICreate;
  const chargeback: IShoppingMallPaymentChargeback =
    await api.functional.shoppingMall.admin.payments.chargebacks.create(
      connection,
      {
        orderPaymentId: orderPayment.id,
        body: chargebackBody,
      },
    );
  typia.assert(chargeback);

  // 19. Create a batch of disputes (>= 25)
  const baseOpenedAt = new Date();
  const severities = ["low", "medium", "high"] as const;
  const statuses = ["open", "under_investigation", "closed"] as const;
  const types = [
    "payment_chargeback",
    "refund_dispute",
    "policy_violation",
  ] as const;

  const disputeCount = 30;
  const createdDisputes: IShoppingMallDispute[] = [];

  for (let i = 0; i < disputeCount; i += 1) {
    const openedAt = new Date(
      baseOpenedAt.getTime() + i * 60_000,
    ).toISOString();
    const severity = severities[i % severities.length];
    const status = statuses[i % statuses.length];
    const type = types[i % types.length];

    const linkToPrimaryEntities = i % 2 === 0;

    const disputeBody = {
      dispute_code: null,
      type,
      severity,
      summary: `Dispute #${i} for pagination & sorting test`,
      description: RandomGenerator.paragraph({ sentences: 8 }),
      opened_at: openedAt,
      shopping_mall_order_id: linkToPrimaryEntities ? order.id : null,
      shopping_mall_refund_request_id: linkToPrimaryEntities
        ? refundRequest.id
        : null,
      shopping_mall_payment_chargeback_id: linkToPrimaryEntities
        ? chargeback.id
        : null,
      shopping_mall_risk_case_id: linkToPrimaryEntities ? riskCase.id : null,
    } satisfies IShoppingMallDispute.ICreate;

    const dispute: IShoppingMallDispute =
      await api.functional.shoppingMall.admin.disputes.create(connection, {
        body: disputeBody,
      });
    typia.assert(dispute);
    createdDisputes.push(dispute);
  }

  TestValidator.predicate(
    "created at least 25 disputes",
    createdDisputes.length >= 25,
  );

  // Helper for string-based ascending comparison
  const isNonIncreasingDate = (a: string, b: string) => a >= b;
  const isNonDecreasingDate = (a: string, b: string) => a <= b;

  // 20. Pagination + sorting by opened_at desc (page 1)
  const page1Request = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "opened_at",
    sort_order: "desc",
  } satisfies IShoppingMallDispute.IRequest;
  const page1: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  TestValidator.equals("page1 current page is 1", page1.pagination.current, 1);
  TestValidator.equals("page1 limit is 10", page1.pagination.limit, 10);

  const page1Data = page1.data;
  TestValidator.equals("page1 returns 10 disputes", page1Data.length, 10);

  for (let i = 1; i < page1Data.length; i += 1) {
    const prev = page1Data[i - 1];
    const curr = page1Data[i];
    TestValidator.predicate(
      "page1 opened_at is sorted desc",
      isNonIncreasingDate(prev.opened_at, curr.opened_at),
    );
  }

  // 21. Pagination + sorting by opened_at desc (page 2)
  const page2Request = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "opened_at",
    sort_order: "desc",
  } satisfies IShoppingMallDispute.IRequest;
  const page2: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: page2Request,
    });
  typia.assert(page2);

  TestValidator.equals("page2 current page is 2", page2.pagination.current, 2);
  TestValidator.equals("page2 limit is 10", page2.pagination.limit, 10);

  const page2Data = page2.data;
  TestValidator.equals("page2 returns 10 disputes", page2Data.length, 10);

  // Ensure no dispute_code overlap between page 1 and page 2
  const page1Codes = new Set(page1Data.map((d) => d.dispute_code));
  const overlap = page2Data.some((d) => page1Codes.has(d.dispute_code));
  TestValidator.predicate(
    "no overlap between page1 and page2 dispute codes",
    !overlap,
  );

  // Combined order still globally sorted by opened_at desc
  const combined = [...page1Data, ...page2Data];
  for (let i = 1; i < combined.length; i += 1) {
    const prev = combined[i - 1];
    const curr = combined[i];
    TestValidator.predicate(
      "combined pages sorted by opened_at desc",
      isNonIncreasingDate(prev.opened_at, curr.opened_at),
    );
  }

  // 22. Sorting by severity asc
  const severityRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "severity",
    sort_order: "asc",
  } satisfies IShoppingMallDispute.IRequest;
  const severityPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: severityRequest,
    });
  typia.assert(severityPage);

  const severityData = severityPage.data;
  for (let i = 1; i < severityData.length; i += 1) {
    const prev = severityData[i - 1];
    const curr = severityData[i];
    TestValidator.predicate(
      "severity ascending order",
      prev.severity <= curr.severity,
    );
  }

  // 23. Sorting by status asc
  const statusRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_field: "status",
    sort_order: "asc",
  } satisfies IShoppingMallDispute.IRequest;
  const statusPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: statusRequest,
    });
  typia.assert(statusPage);

  const statusData = statusPage.data;
  for (let i = 1; i < statusData.length; i += 1) {
    const prev = statusData[i - 1];
    const curr = statusData[i];
    TestValidator.predicate(
      "status ascending order",
      prev.status <= curr.status,
    );
  }
}
