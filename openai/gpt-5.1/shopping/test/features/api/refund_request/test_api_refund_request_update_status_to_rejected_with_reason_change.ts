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

export async function test_api_refund_request_update_status_to_rejected_with_reason_change(
  connection: api.IConnection,
) {
  // 0. Helper creators for random but valid basic values
  const randomEmail = () => typia.random<string & tags.Format<"email">>();
  const randomUrl = () => typia.random<string & tags.Format<"uri">>();
  const nowIso = () => new Date().toISOString();

  // 1. Bootstrap three actors: admin, seller, customer
  const adminEmail = randomEmail();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Explicit admin login to ensure admin auth context is active
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  const sellerEmail = randomEmail();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  const customerEmail = randomEmail();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass!1",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const customerLoginBody = {
    email: customerEmail,
    password: "CustomerPass!1",
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLogin);

  // 2. As admin, create geo, category, policy, SLA, reason, shipping & payment method, sku inventory state
  // Country
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
    phone_code: "+82",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallCountry.ICreate;
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: countryCreateBody,
    });
  typia.assert<IShoppingMallCountry>(country);

  // Region under country
  const regionCreateBody = {
    code: "SEOUL",
    name_en: "Seoul",
    region_type: "city",
    is_active: true,
    sort_order: 1,
  } satisfies IShoppingMallRegion.ICreate;
  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: regionCreateBody,
      },
    );
  typia.assert<IShoppingMallRegion>(region);

  // Category
  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(6)}`,
    name_en: "General",
    description_en: "General category",
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // Business policy
  const policyCode = `refund_policy_${RandomGenerator.alphaNumeric(6)}`;
  const businessPolicyCreateBody = {
    policy_code: policyCode,
    name: "Standard refund policy",
    category: "refund",
    description: "Standard refund rules",
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;
  const businessPolicy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyCreateBody,
      },
    );
  typia.assert<IShoppingMallBusinessPolicy>(businessPolicy);

  // Policy version
  const policyVersionCreateBody = {
    version_code: "v1",
    title: "Standard refund policy v1",
    body_markdown: "# Refund Policy v1",
    parameters_json: null,
    status: "active",
    effective_from: nowIso(),
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
  typia.assert<IShoppingMallPolicyVersion>(policyVersion);

  // Case SLA config bound to policy version
  const caseSlaCreateBody = {
    shopping_mall_business_policy_version_id: policyVersion.id,
    case_type: "refund",
    actor_role: "admin",
    action_type: "final_decision",
    target_duration_seconds: 86400,
    warning_duration_seconds: 43200,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;
  const caseSla: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: caseSlaCreateBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(caseSla);

  // Refund request reason
  const refundReasonCode = `reason_${RandomGenerator.alphaNumeric(5)}`;
  const refundReasonCreateBody = {
    code: refundReasonCode,
    name: "Damaged item",
    description: "Item arrived damaged",
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
  typia.assert<IShoppingMallRefundRequestReason>(refundReason);

  // Shipping method
  const shippingMethodCreateBody = {
    method_code: `ship_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping method",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // Payment method
  const paymentMethodCreateBody = {
    code: `pay_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Card",
    description: "Card payment",
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
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // SKU inventory state
  const skuInventoryStateCreateBody = {
    code: `state_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "In stock state",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const skuInventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(skuInventoryState);

  // 3. As seller, create product and SKU
  const productCreateBody = {
    code: `prod_${RandomGenerator.alphaNumeric(6)}`,
    title: "Refund test product",
    summary: "Product used for refund rejection E2E",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "E2EBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: randomUrl(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // Product-category link (admin)
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
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // SKU
  const skuCreateBody = {
    code: `sku_${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 10000,
    original_price: 12000,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 4. As customer, create shipping address, cart, cart item, order, payment
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "John Customer",
    line1: "Line 1",
    line2: null,
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // Cart
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // Cart item
  const cartItemCreateBody = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id as string & tags.Format<"uuid">,
      body: cartItemCreateBody,
    });
  typia.assert<IShoppingMallCartItem>(cartItem);

  const shippingAddressSnapshotCreateBody = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.name_en,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  // Order
  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [
      {
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32">,
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: null,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // Payment
  const payableAmount = order.grand_total_amount;
  const paymentCreateBody = {
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
        body: paymentCreateBody,
      },
    );
  typia.assert<IShoppingMallOrderPayment>(orderPayment);

  // 5. Customer creates cancellation request (optional link)
  const cancellationRequestCode = `can_${RandomGenerator.alphaNumeric(6)}`;
  const cancellationCreateBody = {
    shopping_mall_order_id: order.id,
    request_code: cancellationRequestCode,
    status: "requested",
    scope_type: "full_order",
    reason_code: "customer_changed_mind",
    reason_description: "Customer changed mind",
    requested_at: null,
    requested_by_actor_type: "customer",
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.create(
      connection,
      {
        body: cancellationCreateBody,
      },
    );
  typia.assert<IShoppingMallCancellationRequest>(cancellationRequest);

  // 6. Admin creates initial refund request in a non-final status
  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: orderPayment.id,
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: admin.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: cancellationRequest.id,
    shopping_mall_case_sla_config_id: caseSla.id,
    requested_total_amount: payableAmount,
    currency_code: order.currency_code,
    reason_description: "Initial refund request for damaged item",
    requested_by_actor_type: "customer",
    requires_return: true,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestCreateBody,
    });
  typia.assert<IShoppingMallRefundRequest>(refundRequest);

  // Sanity check header-level invariants before update
  TestValidator.equals(
    "requested_total_amount should match payable_amount before update",
    refundRequest.requested_total_amount,
    payableAmount,
  );
  TestValidator.equals(
    "currency_code should match order before update",
    refundRequest.currency_code,
    order.currency_code,
  );
  TestValidator.equals(
    "order linkage should match before update",
    refundRequest.shopping_mall_order_id,
    order.id,
  );

  const originalStatus = refundRequest.status;
  const originalUpdatedAt = refundRequest.updated_at;
  const originalCreatedAt = refundRequest.created_at;
  const originalRequestedTotalAmount = refundRequest.requested_total_amount;
  const originalCurrencyCode = refundRequest.currency_code;

  // 7. Admin rejects the refund request: status -> rejected, approved_total_amount -> null,
  // reason_description changed, requires_return=false, decided_at set.
  const rejectionReasonDescription = "Order outside eligible refund window";
  const decidedAt = nowIso();
  const refundUpdateBody = {
    status: "rejected",
    approved_total_amount: null,
    reason_description: rejectionReasonDescription,
    requires_return: false,
    decided_at: decidedAt,
    completed_at: null,
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const updatedRefund: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: refundUpdateBody,
    });
  typia.assert<IShoppingMallRefundRequest>(updatedRefund);

  // 8. Validate business invariants after rejection
  // Status updated and different from original
  TestValidator.notEquals(
    "status should change after rejection update",
    updatedRefund.status,
    originalStatus,
  );
  TestValidator.equals(
    "status should be rejected after update",
    updatedRefund.status,
    "rejected",
  );

  // Approved amount must be null, requested_total_amount unchanged
  TestValidator.equals(
    "approved_total_amount should be null after rejection",
    updatedRefund.approved_total_amount,
    null,
  );
  TestValidator.equals(
    "requested_total_amount should stay unchanged after rejection",
    updatedRefund.requested_total_amount,
    originalRequestedTotalAmount,
  );

  // Currency and order linkage preserved
  TestValidator.equals(
    "currency_code unchanged after rejection",
    updatedRefund.currency_code,
    originalCurrencyCode,
  );
  TestValidator.equals(
    "order linkage unchanged after rejection",
    updatedRefund.shopping_mall_order_id,
    refundRequest.shopping_mall_order_id,
  );

  // Payment linkage preserved
  if (
    refundRequest.orderPayment !== undefined &&
    refundRequest.orderPayment !== null
  ) {
    TestValidator.predicate(
      "payment summary should still be linked after rejection",
      updatedRefund.orderPayment !== null &&
        updatedRefund.orderPayment !== undefined,
    );
    if (
      updatedRefund.orderPayment !== null &&
      updatedRefund.orderPayment !== undefined
    ) {
      TestValidator.equals(
        "payment id in summary should remain the same",
        updatedRefund.orderPayment.id,
        refundRequest.orderPayment.id,
      );
    }
  }

  // Reason description changed to rejection reason
  TestValidator.equals(
    "reason_description updated with rejection text",
    updatedRefund.reason_description,
    rejectionReasonDescription,
  );

  // requires_return now false
  TestValidator.equals(
    "requires_return should be false after rejection",
    updatedRefund.requires_return,
    false,
  );

  // decided_at is set and created_at unchanged
  TestValidator.predicate(
    "decided_at should be non-null after rejection",
    updatedRefund.decided_at !== null && updatedRefund.decided_at !== undefined,
  );
  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedRefund.created_at,
    originalCreatedAt,
  );

  // updated_at should move forward in time (string compare is ok for ISO timestamps)
  TestValidator.predicate(
    "updated_at should be greater than original after rejection",
    updatedRefund.updated_at > originalUpdatedAt,
  );

  // Header should not be interpretable as approved: enforce that
  TestValidator.equals(
    "approved_total_amount remains null so header cannot be treated as approved",
    updatedRefund.approved_total_amount,
    null,
  );
}
