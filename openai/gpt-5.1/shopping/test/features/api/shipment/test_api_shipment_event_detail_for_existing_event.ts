import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentEvent";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate retrieval of detailed shipment event information using composite key
 * (shipmentCode, eventId).
 *
 * Business goal: Ensure that once a shipment event has been appended to an
 * actual shipment’s timeline, clients can retrieve that single event with full
 * detail using the pair of identifiers (shipmentCode, eventId). The response
 * must faithfully reflect the event that was recorded and be scoped to the
 * correct shipment.
 *
 * High-level flow:
 *
 * 1. Admin, seller, and customer actors join the system so that all roles needed
 *    for catalog configuration and checkout exist.
 * 2. As admin, configure the core environment needed to create a real shippable
 *    order:
 *
 *    - Create a country and region,
 *    - Create a shipping method,
 *    - Create a payment method.
 * 3. As seller, create product taxonomy and inventory:
 *
 *    - Create a category,
 *    - Create a product,
 *    - Associate the product with the category,
 *    - Create a SKU inventory state that is purchasable,
 *    - Create a SKU under the product using that inventory state.
 * 4. As customer, perform a realistic path to an order that can generate a
 *    shipment:
 *
 *    - Create a cart for actor_type="customer",
 *    - Create a customer address tied to the customer,
 *    - Create an order referencing the cart items, address snapshot, shipping
 *         method, and payment method,
 *    - As admin, create a shipment for the order using POST
 *         /shoppingMall/admin/orders/{orderCode}/shipments, capturing the
 *         shipment_code.
 * 5. Create a shipment event for the shipment using POST
 *    /shoppingMall/shipments/{shipmentCode}/events with well-defined values:
 *
 *    - Event_type = "status_change",
 *    - Status = some plausible shipping_status (e.g., "shipped"),
 *    - Description = a clear message,
 *    - Event_time = a precise ISO date-time near "now". Capture the returned
 *         IShoppingMallShipmentEvent, especially its `id` and `shipment`
 *         summary.
 * 6. Call GET /shoppingMall/shipments/{shipmentCode}/events/{eventId} using the
 *    same shipmentCode and the captured event.id.
 * 7. Validate that:
 *
 *    - Typia.assert() passes on the response structure.
 *    - Response.id equals the event.id used in the path.
 *    - Response.event_type equals the originally sent event_type.
 *    - Response.status and response.description match the created values (including
 *         nulls when used).
 *    - Response.event_time equals the original event_time string.
 *    - Response.created_at is a valid date-time not later than "now".
 *    - Response.shipment.shipment_code matches the shipmentCode.
 *    - Response.shipment.shipping_status is consistent with the shipment’s current
 *         shipping_status (at minimum, equals shipment.shipping_status returned
 *         from the shipment creation call).
 *
 * Implementation notes:
 *
 * - Use the concrete DTO types:
 *
 *   - IShoppingMallAdminJoin.ICreate for admin join,
 *   - IShoppingMallAdminLogin.ICreate for admin login,
 *   - IShoppingMallSellerAuthJoin.IRequest / IShoppingMallSellerAuthLogin.IRequest
 *       for seller flows,
 *   - IShoppingMallCustomerJoin.IRequest / IShoppingMallCustomerLogin.IRequest for
 *       customer flows,
 *   - IShoppingMallCountry.ICreate and IShoppingMallRegion.ICreate for geography,
 *   - IShoppingMallShippingMethod.ICreate for shipping method,
 *   - IShoppingMallPaymentMethod.ICreate for payment method,
 *   - IShoppingMallCategory.ICreate for catalog category,
 *   - IShoppingMallProduct.ICreate for product,
 *   - IShoppingMallProductCategory.ICreate for product-category link,
 *   - IShoppingMallSkuInventoryState.ICreate for inventory state,
 *   - IShoppingMallSku.ICreate for SKU,
 *   - IShoppingMallCart.ICreate for cart,
 *   - IShoppingMallCustomerAddress.ICreate for address,
 *   - IShoppingMallOrder.ICreate and IShoppingMallOrderItem.ICreate for order and
 *       its items,
 *   - IShoppingMallShippingAddressSnapshot.ICreate for inline shipping address
 *       snapshot when needed,
 *   - IShoppingMallShipment.ICreate for shipment creation,
 *   - IShoppingMallShipmentEvent.ICreate for the shipment event.
 * - Respect the tag constraints using typia.random<...>() or RandomGenerator
 *   helpers, and ensure we never violate types (no `as any`, no wrong enums,
 *   etc.).
 * - Always await API calls and validate non-void responses with typia.assert().
 * - Use TestValidator.equals / predicate with descriptive titles for business
 *   assertions.
 */
export async function test_api_shipment_event_detail_for_existing_event(
  connection: api.IConnection,
) {
  // 1. Admin, seller, and customer joins
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@admin.test.com",
    password: "Admin1234!",
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const sellerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@seller.test.com",
    password: "Seller1234!",
    ip: null,
    href: "https://seller.test.com/join",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const customerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@customer.test.com",
    password: "Customer1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 2. As admin, configure country, region, shipping method, payment method
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

  // 3. As seller, create category, product, product-category link, sku inventory state, and SKU
  const categoryCreateBody = typia.random<IShoppingMallCategory.ICreate>();
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const productCategoryCreateBody =
    typia.random<IShoppingMallProductCategory.ICreate>();
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategory);

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

  const skuCreateBodyBase = typia.random<IShoppingMallSku.ICreate>();
  const skuCreateBody: IShoppingMallSku.ICreate = {
    ...skuCreateBodyBase,
    shopping_mall_sku_inventory_state_id: skuInventoryState.id,
  };
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. As customer, create cart, address, and order
  const cartCreateBody: IShoppingMallCart.ICreate = {
    actor_type: "customer",
    status: undefined,
    currency_code: undefined,
  };
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert(cart);

  const customerAddressCreateBodyBase =
    typia.random<IShoppingMallCustomerAddress.ICreate>();
  const customerAddressCreateBody: IShoppingMallCustomerAddress.ICreate = {
    ...customerAddressCreateBodyBase,
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
  };
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerAuth.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const shippingSnapshot: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "010-0000-0000",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: region.code,
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? null,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshot,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4-2. As admin, create shipment for the order
  const shipmentCreateBodyBase = typia.random<IShoppingMallShipment.ICreate>();
  const shipmentCreateBody: IShoppingMallShipment.ICreate = {
    ...shipmentCreateBodyBase,
    orderCode: order.order_code,
    shippingMethodId: shippingMethod.id,
  };
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  const shipmentCode: string = shipment.shipment_code;

  // 5. Create shipment event via POST /shoppingMall/shipments/{shipmentCode}/events
  const now = new Date();
  const eventTime = now.toISOString();

  const shipmentEventCreateBody: IShoppingMallShipmentEvent.ICreate = {
    event_type: "status_change",
    status: shipment.shipping_status,
    description: "Shipment status changed for testing detail retrieval",
    event_time: eventTime as string & tags.Format<"date-time">,
  };

  const createdEvent: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode,
      body: shipmentEventCreateBody,
    });
  typia.assert(createdEvent);

  // 6. Retrieve event via GET /shoppingMall/shipments/{shipmentCode}/events/{eventId}
  const fetchedEvent: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.at(connection, {
      shipmentCode,
      eventId: createdEvent.id,
    });
  typia.assert(fetchedEvent);

  // 7. Assertions
  TestValidator.equals(
    "event id should match path id",
    fetchedEvent.id,
    createdEvent.id,
  );
  TestValidator.equals(
    "event_type should match created value",
    fetchedEvent.event_type,
    shipmentEventCreateBody.event_type,
  );
  TestValidator.equals(
    "status should match created value",
    fetchedEvent.status,
    shipmentEventCreateBody.status,
  );
  TestValidator.equals(
    "description should match created value",
    fetchedEvent.description,
    shipmentEventCreateBody.description,
  );
  TestValidator.equals(
    "event_time should match created value",
    fetchedEvent.event_time,
    shipmentEventCreateBody.event_time,
  );

  // created_at should not be in the future
  const createdAtDate = new Date(fetchedEvent.created_at);
  const nowAfterFetch = new Date();
  TestValidator.predicate(
    "created_at must not be later than now",
    createdAtDate.getTime() <= nowAfterFetch.getTime(),
  );

  TestValidator.equals(
    "shipmentCode in summary should match created shipment",
    fetchedEvent.shipment.shipment_code,
    shipmentCode,
  );
  TestValidator.equals(
    "shipment shipping_status in summary should match shipment",
    fetchedEvent.shipment.shipping_status,
    shipment.shipping_status,
  );
}
