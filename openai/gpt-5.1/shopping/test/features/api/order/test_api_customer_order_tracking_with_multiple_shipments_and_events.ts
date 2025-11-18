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
import type { IShoppingMallOrderTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderTracking";
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

export async function test_api_customer_order_tracking_with_multiple_shipments_and_events(
  connection: api.IConnection,
) {
  // 1. Create primary customer via join
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Create secondary customer for auth check
  const otherCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://customer.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://customer.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoinBody,
    });
  typia.assert(otherCustomer);

  // 3. Create seller via join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Create admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 5. Admin creates country
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

  // 6. Admin creates region under country
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

  // 7. Admin creates category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(8),
    name_en: "General",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 8. Admin creates SKU inventory state
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

  // 9. Admin creates shipping method
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

  // 10. Admin creates payment method
  const paymentMethodCreateBody = {
    code: "CARD",
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
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 11. Switch to seller and create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://seller.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: "Tracking Test Product",
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 12. Admin links product to category
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

  // 13. Seller creates SKU for product
  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    barcode: null,
    status: "active",
    price: 10000,
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

  // 14. Switch to customer and create customer address
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "Line 1",
    line2: "Line 2",
    city: "Seoul",
    postal_code: "12345",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 15. Customer creates cart
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

  // 16. Customer creates main order with one order item quantity 3
  const orderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 3 as number & tags.Type<"int32">,
  };

  const shippingSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate = {
    recipient_name: customerAddress.recipient_name,
    phone_number: customerAddress.phone_number ?? "0000000000",
    country_code: country.country_code,
    postal_code: customerAddress.postal_code,
    state_or_region: "Seoul",
    city: customerAddress.city,
    address_line1: customerAddress.line1,
    address_line2: customerAddress.line2 ?? undefined,
  } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const mainOrderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [orderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  const mainOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: mainOrderCreateBody,
    });
  typia.assert(mainOrder);

  TestValidator.equals(
    "order currency matches cart",
    mainOrder.currency_code,
    cart.currency_code,
  );

  // 17. Attach shipping address snapshot explicitly via order endpoint
  const orderShippingCreateBody: IShoppingMallOrderShippingAddress.ICreate = {
    recipient_name: shippingSnapshotCreate.recipient_name,
    line1: shippingSnapshotCreate.address_line1,
    line2: shippingSnapshotCreate.address_line2 ?? null,
    city: shippingSnapshotCreate.city,
    postal_code: shippingSnapshotCreate.postal_code,
    country_code: shippingSnapshotCreate.country_code,
    region: shippingSnapshotCreate.state_or_region,
    phone_number: shippingSnapshotCreate.phone_number,
  } satisfies IShoppingMallOrderShippingAddress.ICreate;

  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: mainOrder.order_code,
        body: orderShippingCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 18. Switch to admin to create shipments
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  // 18-1. First shipment: quantity 1
  const firstShipmentCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: undefined,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "in_transit",
    carrierName: "Carrier-A",
    trackingNumber: "TRK1",
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: mainOrder.items[0].id,
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallShipmentItem.ICreate,
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const firstShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: mainOrder.order_code,
        body: firstShipmentCreateBody,
      },
    );
  typia.assert(firstShipment);

  // 18-2. Second shipment: quantity 2
  const secondShipmentCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: undefined,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "delivered",
    carrierName: "Carrier-A",
    trackingNumber: "TRK2",
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: mainOrder.items[0].id,
        shopping_mall_sku_id: sku.id,
        quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallShipmentItem.ICreate,
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const secondShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: mainOrder.order_code,
        body: secondShipmentCreateBody,
      },
    );
  typia.assert(secondShipment);

  TestValidator.notEquals(
    "shipment codes must differ",
    firstShipment.shipment_code,
    secondShipment.shipment_code,
  );

  // 19. Add shipment events for first shipment: shipped -> in_transit
  const eventTimesFirst = [
    new Date(Date.now() - 1000 * 60).toISOString(),
    new Date().toISOString(),
  ];

  const firstShipmentEvent1Body: IShoppingMallShipmentEvent.ICreate = {
    event_type: "status_change",
    status: "shipped",
    description: "Package shipped",
    event_time: eventTimesFirst[0] as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentEvent.ICreate;

  const firstShipmentEvent2Body: IShoppingMallShipmentEvent.ICreate = {
    event_type: "status_change",
    status: "in_transit",
    description: "In transit",
    event_time: eventTimesFirst[1] as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentEvent.ICreate;

  const firstEvent1: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: firstShipment.shipment_code,
      body: firstShipmentEvent1Body,
    });
  typia.assert(firstEvent1);

  const firstEvent2: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: firstShipment.shipment_code,
      body: firstShipmentEvent2Body,
    });
  typia.assert(firstEvent2);

  // 20. Add shipment events for second shipment: shipped -> delivered
  const eventTimesSecond = [
    new Date(Date.now() - 1000 * 30).toISOString(),
    new Date().toISOString(),
  ];

  const secondShipmentEvent1Body: IShoppingMallShipmentEvent.ICreate = {
    event_type: "status_change",
    status: "shipped",
    description: "Package shipped",
    event_time: eventTimesSecond[0] as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentEvent.ICreate;

  const secondShipmentEvent2Body: IShoppingMallShipmentEvent.ICreate = {
    event_type: "status_change",
    status: "delivered",
    description: "Delivered",
    event_time: eventTimesSecond[1] as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentEvent.ICreate;

  const secondEvent1: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: secondShipment.shipment_code,
      body: secondShipmentEvent1Body,
    });
  typia.assert(secondEvent1);

  const secondEvent2: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: secondShipment.shipment_code,
      body: secondShipmentEvent2Body,
    });
  typia.assert(secondEvent2);

  // 21. Create another order + shipment to assert tracking isolation
  const otherOrderItemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32">,
  };

  const otherOrderCreateBody: IShoppingMallOrder.ICreate = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: [otherOrderItemCreate],
    shipping_address_id: customerAddress.id,
    shipping_address_snapshot: shippingSnapshotCreate,
    shipping_method_id: shippingMethod.id,
    payment_method_id: paymentMethod.id,
    buyer_memo: null,
    platform_note: null,
  } satisfies IShoppingMallOrder.ICreate;

  // Ensure acting as customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const otherOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: otherOrderCreateBody,
    });
  typia.assert(otherOrder);

  // Switch to admin to create a shipment for other order
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const otherShipmentCreateBody: IShoppingMallShipment.ICreate = {
    orderCode: undefined,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "shipped",
    carrierName: "Carrier-B",
    trackingNumber: "TRK-OTHER",
    expectedShipDate: new Date().toISOString(),
    shipmentItems: [
      {
        shopping_mall_order_item_id: otherOrder.items[0].id,
        shopping_mall_sku_id: sku.id,
        quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallShipmentItem.ICreate,
    ],
  } satisfies IShoppingMallShipment.ICreate;

  const otherShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: otherOrder.order_code,
        body: otherShipmentCreateBody,
      },
    );
  typia.assert(otherShipment);

  // 22. Switch back to main customer and call tracking
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const tracking: IShoppingMallOrderTracking =
    await api.functional.shoppingMall.customer.orders.tracking.at(connection, {
      orderCode: mainOrder.order_code,
    });
  typia.assert(tracking);

  // Order summary validations
  TestValidator.equals(
    "tracking order_code matches main order",
    tracking.order.order_code,
    mainOrder.order_code,
  );
  TestValidator.equals(
    "tracking currency matches order",
    tracking.order.currency_code,
    mainOrder.currency_code,
  );
  TestValidator.equals(
    "tracking grand_total_amount matches",
    tracking.order.grand_total_amount,
    mainOrder.grand_total_amount,
  );
  TestValidator.predicate(
    "tracking placed_at is not empty",
    tracking.order.placed_at.length > 0,
  );

  // Shipments count and uniqueness
  TestValidator.equals(
    "tracking has two shipments",
    tracking.shipments.length,
    2,
  );

  const shipmentCodes = tracking.shipments.map((s) => s.shipment_code);
  TestValidator.notEquals(
    "shipment codes in tracking must be unique",
    shipmentCodes[0],
    shipmentCodes[1],
  );

  // Ensure otherShipment is not present in tracking
  TestValidator.predicate(
    "tracking does not include other order shipment",
    shipmentCodes.indexOf(otherShipment.shipment_code) === -1,
  );

  // Validate each shipment details and event ordering
  for (const shipment of tracking.shipments) {
    // address snapshot consistency
    TestValidator.equals(
      "shipment address recipient matches order shipping",
      shipment.shipping_address.recipient_name,
      orderShippingAddress.recipient_name,
    );
    TestValidator.equals(
      "shipment address city matches",
      shipment.shipping_address.city,
      orderShippingAddress.city,
    );
    TestValidator.equals(
      "shipment address postal_code matches",
      shipment.shipping_address.postal_code,
      orderShippingAddress.postal_code,
    );
    TestValidator.equals(
      "shipment address country_code matches",
      shipment.shipping_address.country_code,
      orderShippingAddress.country_code,
    );

    // shipping method snapshot consistency
    TestValidator.equals(
      "shipment method code matches configured",
      shipment.shipping_method.method_code,
      shippingMethod.method_code,
    );
    TestValidator.equals(
      "shipment method display name matches configured",
      shipment.shipping_method.display_name,
      shippingMethod.display_name,
    );

    // events sorted by event_time ascending and status of last event matches shipping_status
    if (shipment.events.length > 0) {
      const times = shipment.events.map((e) => e.event_time);
      const sortedTimes = [...times].sort();
      TestValidator.equals(
        "shipment events are sorted by event_time ascending",
        times,
        sortedTimes,
      );

      const lastEvent = shipment.events[shipment.events.length - 1];
      if (lastEvent.status !== undefined) {
        TestValidator.equals(
          "shipment shipping_status reflects last event status",
          shipment.shipping_status,
          lastEvent.status,
        );
      }
    }
  }

  // 23. Authorization enforcement: other customer should not access tracking
  await api.functional.auth.customer.login(connection, {
    body: {
      email: otherCustomerJoinBody.email,
      password: otherCustomerJoinBody.password,
      ip: null,
      href: "https://customer.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://customer.example.com" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  await TestValidator.error(
    "non-owning customer cannot access tracking",
    async () => {
      await api.functional.shoppingMall.customer.orders.tracking.at(
        connection,
        { orderCode: mainOrder.order_code },
      );
    },
  );
}
