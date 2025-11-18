import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
import type { IShoppingMallPaymentRefundItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefundItem";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestItem";
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
 * Validate that customers cannot update refund request items after a refund
 * request is no longer editable.
 *
 * Business context: A refund request is opened for a customer order and one or
 * more line-level refund items are created under that request. Once the refund
 * request has reached a decided/closed state in the governance lifecycle,
 * business rules state that customers must no longer be able to modify its
 * items. Any attempt to change requested quantities or amounts should be
 * rejected with a business error and must not lead to partial updates.
 *
 * This E2E test simulates the following multi-actor workflow using only
 * available SDK functions:
 *
 * 1. Set up actors
 *
 *    - Register an admin, a seller, and a customer using their respective join
 *         endpoints.
 *    - Authentication headers are automatically handled by the SDK after join.
 * 2. Configure base catalog and policy data as admin
 *
 *    - Create a country (for addresses) and a region under that country.
 *    - Create a shipping method and a payment method.
 *    - Create a SKU inventory state that is purchasable.
 *    - Create a refund request reason that is active for refunds.
 * 3. Create product and SKU as seller
 *
 *    - Create a product with reasonable default content.
 *    - Create a SKU under that product associated with the previously created
 *         inventory state.
 * 4. Place an order as customer
 *
 *    - Create a customer cart with actor_type="customer" and a consistent currency.
 *    - Create a customer shipping address referencing the configured country/region.
 *    - Create an order with one item referencing the SKU, shipping address, shipping
 *         method, and payment method.
 * 5. Open a refund request as admin
 *
 *    - Create a refund request header for the order with a requested_total_amount
 *         and currency_code matching the order, and link it to the refund
 *         reason. The actor type is set to "customer" to simulate a
 *         customer-originated refund.
 * 6. Create a refund request item as customer
 *
 *    - Under the created refund request, create a line-level refund item for the
 *         order item with a requestedAmount and (optionally)
 *         requestedQuantity.
 * 7. Attempt to update the refund request item after decision
 *
 *    - For the purpose of this E2E, we assume that the backend treats the refund
 *         request as non-editable in this context (representing a
 *         decided/closed state) and therefore forbids updates from the
 *         customer. We do not call any non-existent decision endpoint.
 *    - As the same customer, attempt to update the refund request item via PUT
 *         /shoppingMall/customer/refundRequests/{refundRequestId}/items/{refundRequestItemId}
 *         with changed requestedAmount and/or requestedQuantity.
 * 8. Validate behavior
 *
 *    - Use TestValidator.error to assert that the update call fails with a business
 *         error (some 4xx status under the hood). We do not assert the exact
 *         HTTP status code.
 *    - Because there is no read endpoint for refund request items in the SDK, we
 *         validate only that the update cannot be successfully executed, which
 *         implies that no partial update occurred.
 */
export async function test_api_customer_cannot_update_refund_request_item_after_decision(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.join/" as string & tags.Format<"uri">,
    referrer: "https://referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.join/" as string & tags.Format<"uri">,
    referrer: "https://referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassword123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.join/" as string & tags.Format<"uri">,
    referrer: "https://referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Admin config: country, region, shipping method, payment method, sku inventory state, refund reason
  const countryCreateBody = {
    country_code: "KR",
    name_en: "Korea",
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

  const shippingMethodCreateBody = {
    method_code: "STANDARD",
    display_name: "Standard Shipping",
    service_level_description: "Standard shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  const paymentMethodCreateBody = {
    code: "CARD",
    display_name: "Credit Card",
    description: "Generic card payment",
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

  const skuInventoryStateCreateBody = {
    code: "in_stock",
    name: "In Stock",
    description: "Available for sale",
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

  const refundReasonCreateBody = {
    code: "DAMAGED_ITEM",
    name: "Item damaged",
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
  typia.assert(refundReason);

  // 3. Seller: product and SKU (seller is already authenticated)
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-1",
    status: "active",
    primary_image_uri: "https://example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 100,
    original_price: null,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: null,
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

  // 4. Customer cart, address, order
  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.login/" as string & tags.Format<"uri">,
    referrer: "https://referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const reloggedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(reloggedCustomer);

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

  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: reloggedCustomer.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAddress.recipient_name,
      phone_number: customerAddress.phone_number ?? RandomGenerator.mobile(),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: region.name_en,
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    };

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingAddressSnapshotCreate,
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

  // Ensure there is at least one order item to work with
  TestValidator.predicate(
    "order must contain at least one item",
    order.items.length > 0,
  );
  const refundOrderItem: IShoppingMallOrderItem = order.items[0];
  typia.assert(refundOrderItem);

  // 5. Admin: refund request header
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.login/" as string & tags.Format<"uri">,
    referrer: "https://referrer/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const reloggedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_order_payment_id: null,
    shopping_mall_customer_id: reloggedCustomer.id,
    shopping_mall_seller_id: null,
    shopping_mall_admin_id: reloggedAdmin.id,
    shopping_mall_refund_request_reason_id: refundReason.id,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_case_sla_config_id: null,
    requested_total_amount: order.grand_total_amount,
    currency_code: order.currency_code,
    reason_description: "Customer reports damaged item",
    requested_by_actor_type: "customer",
    requires_return: false,
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.create(connection, {
      body: refundRequestCreateBody,
    });
  typia.assert(refundRequest);

  // 6. Customer: create refund request item
  const refundItemCreateBody = {
    orderItemId: refundOrderItem.id,
    paymentRefundItemId: null,
    reasonId: refundReason.id,
    requestedQuantity: 1 as number & tags.Type<"int32">,
    requestedAmount: refundOrderItem.line_total,
    currencyCode: refundRequest.currency_code,
  } satisfies IShoppingMallRefundRequestItem.ICreate;
  const refundItem: IShoppingMallRefundRequestItem =
    await api.functional.shoppingMall.customer.refundRequests.items.create(
      connection,
      {
        refundRequestId: refundRequest.id,
        body: refundItemCreateBody,
      },
    );
  typia.assert(refundItem);

  const originalRequestedQuantity = refundItem.requested_quantity;
  const originalRequestedAmount = refundItem.requested_amount;

  // 7. Assume refund request is decided/non-editable in this context and attempt update as customer
  const reloggedCustomer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(reloggedCustomer2);

  const refundItemUpdateBody: IShoppingMallRefundRequestItem.IUpdate = {
    shopping_mall_order_item_id: refundOrderItem.id,
    shopping_mall_payment_refund_item_id: null,
    shopping_mall_refund_request_reason_id: refundReason.id,
    requested_quantity:
      originalRequestedQuantity !== null &&
      originalRequestedQuantity !== undefined
        ? ((originalRequestedQuantity + 1) as number & tags.Type<"int32">)
        : (1 as number & tags.Type<"int32">),
    approved_quantity: null,
    requested_amount: originalRequestedAmount + 10,
    approved_amount: null,
    currency_code: refundItem.currency_code,
  };

  await TestValidator.error(
    "customer cannot update refund request item once non-editable",
    async () => {
      await api.functional.shoppingMall.customer.refundRequests.items.update(
        connection,
        {
          refundRequestId: refundRequest.id,
          refundRequestItemId: refundItem.id,
          body: refundItemUpdateBody,
        },
      );
    },
  );

  // Business validation: original values are still what we captured in-memory (sanity check only)
  TestValidator.equals(
    "original requested quantity snapshot preserved in test scope",
    refundItem.requested_quantity,
    originalRequestedQuantity,
  );
  TestValidator.equals(
    "original requested amount snapshot preserved in test scope",
    refundItem.requested_amount,
    originalRequestedAmount,
  );
}
