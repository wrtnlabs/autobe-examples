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
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";
import type { IShoppingMallShipmentTrackingShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingShippingAddress";
import type { IShoppingMallShipmentTrackingShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingShippingMethod";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_customer_shipment_tracking_for_single_shipment(
  connection: api.IConnection,
) {
  // 1. Admin, seller, and primary customer authentication setup
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://seller.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://customer.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  const customerLoginBody = {
    email: customer.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.test/login" as string &
      tags.Format<"uri">,
    referrer: "https://customer.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);

  // 2. Admin creates country and region master data
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
  typia.assert<IShoppingMallCountry>(country);

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
  typia.assert<IShoppingMallRegion>(region);

  // 3. Admin creates category
  const categoryCreateBody = {
    parent_id: null,
    slug: `electronics-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Electronics",
    description_en: "Electronics category",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 4. Seller creates product
  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "ACME",
    model_name: "ACME-1000",
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.test/images/prod-acme-1000.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Admin associates product with category
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

  // 6. Admin creates SKU inventory state
  const inventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(4)}`,
    name: "In Stock",
    description: "Purchasable stock",
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;
  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryState);

  // 7. Seller creates SKU for product
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(6)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 199.99 as number & tags.Minimum<0>,
    original_price: 249.99 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id as string & tags.Format<"uuid">,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sku);

  // 8. Customer creates cart
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

  // 9. Customer creates shipping address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: RandomGenerator.name(2),
    line1: "1-1 Seocho-daero",
    line2: "Suite 101",
    city: "Seoul",
    postal_code: "06236",
    phone_number: RandomGenerator.mobile("010"),
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
  typia.assert<IShoppingMallCustomerAddress>(customerAddress);

  // 10. Admin creates payment method
  const paymentMethodCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Credit Card",
    description: "Standard credit card payment",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 11. Admin creates shipping method
  const shippingMethodCreateBody = {
    method_code: `standard_${RandomGenerator.alphaNumeric(4)}`,
    display_name: "Standard Shipping",
    service_level_description: "3-5 business days",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert<IShoppingMallShippingMethod>(shippingMethod);

  // 12. Customer creates order referencing cart, address, shipping method, payment method
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_sku_id: sku.id,
      quantity: 1 as number & tags.Type<"int32">,
    },
  ];
  const shippingAddressSnapshotCreate: IShoppingMallShippingAddressSnapshot.ICreate =
    {
      recipient_name: customerAddress.recipient_name,
      phone_number:
        customerAddress.phone_number ?? RandomGenerator.mobile("010"),
      country_code: country.country_code,
      postal_code: customerAddress.postal_code,
      state_or_region: region.name_en,
      city: customerAddress.city,
      address_line1: customerAddress.line1,
      address_line2: customerAddress.line2 ?? null,
    } satisfies IShoppingMallShippingAddressSnapshot.ICreate;

  const orderCreateBody = {
    cart_id: cart.id,
    currency_code: cart.currency_code,
    items: orderItems,
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
  typia.assert<IShoppingMallOrder>(order);

  // 13. Customer attaches shipping address snapshot to order by orderCode
  const orderShippingAddressCreate: IShoppingMallOrderShippingAddress.ICreate =
    {
      recipient_name: shippingAddressSnapshotCreate.recipient_name,
      line1: shippingAddressSnapshotCreate.address_line1,
      line2: shippingAddressSnapshotCreate.address_line2,
      city: shippingAddressSnapshotCreate.city,
      postal_code: shippingAddressSnapshotCreate.postal_code,
      country_code: shippingAddressSnapshotCreate.country_code as string &
        tags.MinLength<2> &
        tags.MaxLength<2>,
      region: shippingAddressSnapshotCreate.state_or_region,
      phone_number: shippingAddressSnapshotCreate.phone_number,
    } satisfies IShoppingMallOrderShippingAddress.ICreate;
  const orderShippingAddress: IShoppingMallOrderShippingAddress =
    await api.functional.shoppingMall.customer.orders.shippingAddress.create(
      connection,
      {
        orderCode: order.order_code,
        body: orderShippingAddressCreate,
      },
    );
  typia.assert<IShoppingMallOrderShippingAddress>(orderShippingAddress);

  // 14. Admin creates shipment for order
  const shipmentItems: IShoppingMallShipmentItem.ICreate[] = order.items.map(
    (item) =>
      ({
        shopping_mall_order_item_id: item.id,
        shopping_mall_sku_id: item.sku.id,
        quantity: item.quantity as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      }) satisfies IShoppingMallShipmentItem.ICreate,
  );

  const expectedShipDate = new Date();
  const expectedShipDateIso = expectedShipDate.toISOString();

  const shipmentCreateBody = {
    orderCode: undefined,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: "KoreaPost",
    trackingNumber: `TRACK-${RandomGenerator.alphaNumeric(10)}`,
    expectedShipDate: expectedShipDateIso,
    shipmentItems,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: shipmentCreateBody,
      },
    );
  typia.assert<IShoppingMallShipment>(shipment);

  const shipmentCode = shipment.shipment_code;

  // 15. Admin creates shipment events timeline
  const baseEventTime = new Date();
  const eventPayloads: IShoppingMallShipmentEvent.ICreate[] = [
    {
      event_type: "created",
      status: "pending",
      description: "Shipment created",
      event_time: new Date(
        baseEventTime.getTime() + 1 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      event_type: "packed",
      status: "preparing",
      description: "Package prepared",
      event_time: new Date(
        baseEventTime.getTime() + 2 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      event_type: "handoff",
      status: "shipped",
      description: "Handed off to carrier",
      event_time: new Date(
        baseEventTime.getTime() + 3 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      event_type: "in_transit",
      status: "in_transit",
      description: "In transit",
      event_time: new Date(
        baseEventTime.getTime() + 4 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      event_type: "delivered",
      status: "delivered",
      description: "Delivered to customer",
      event_time: new Date(
        baseEventTime.getTime() + 5 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
  ];

  const createdEvents: IShoppingMallShipmentEvent[] = [];
  for (const payload of eventPayloads) {
    const created: IShoppingMallShipmentEvent =
      await api.functional.shoppingMall.shipments.events.create(connection, {
        shipmentCode,
        body: payload,
      });
    typia.assert<IShoppingMallShipmentEvent>(created);
    createdEvents.push(created);
  }

  // 16. Owning customer fetches tracking information
  const tracking: IShoppingMallShipmentTracking =
    await api.functional.shoppingMall.customer.shipments.tracking.at(
      connection,
      {
        shipmentCode,
      },
    );
  typia.assert<IShoppingMallShipmentTracking>(tracking);

  // 17. Validate top-level tracking fields
  TestValidator.equals(
    "shipmentCode should match path and created shipment",
    tracking.shipmentCode,
    shipmentCode,
  );

  const expectedLatestStatus = eventPayloads[eventPayloads.length - 1].status;
  TestValidator.equals(
    "shippingStatus should reflect latest event status",
    tracking.shippingStatus,
    expectedLatestStatus,
  );

  TestValidator.equals(
    "carrierName should match shipment carrier",
    tracking.carrierName,
    shipment.carrier_name ?? null,
  );

  TestValidator.equals(
    "trackingNumber should match shipment tracking number",
    tracking.trackingNumber,
    shipment.tracking_number ?? null,
  );

  TestValidator.equals(
    "expectedShipDate should match shipment expected_ship_date",
    tracking.expectedShipDate,
    shipment.expected_ship_date ?? null,
  );

  TestValidator.equals(
    "shippedAt should match shipment shipped_at",
    tracking.shippedAt,
    shipment.shipped_at ?? null,
  );

  TestValidator.equals(
    "deliveredAt should match shipment delivered_at",
    tracking.deliveredAt,
    shipment.delivered_at ?? null,
  );

  TestValidator.equals(
    "createdAt should match shipment created_at",
    tracking.createdAt,
    shipment.created_at,
  );

  TestValidator.equals(
    "updatedAt should match shipment updated_at",
    tracking.updatedAt,
    shipment.updated_at,
  );

  // 18. Validate shippingMethod snapshot
  TestValidator.equals(
    "shipping method id should match configured shipping method",
    tracking.shippingMethod.id,
    shippingMethod.id,
  );
  TestValidator.equals(
    "shipping method code should match configured shipping method",
    tracking.shippingMethod.methodCode,
    shippingMethod.method_code,
  );
  TestValidator.equals(
    "shipping method display name should match configured shipping method",
    tracking.shippingMethod.displayName,
    shippingMethod.display_name,
  );
  TestValidator.equals(
    "shipping method service level description should match configured shipping method",
    tracking.shippingMethod.serviceLevelDescription,
    shippingMethod.service_level_description ?? null,
  );
  TestValidator.equals(
    "shipping method createdAt should match configured shipping method",
    tracking.shippingMethod.createdAt,
    shippingMethod.created_at,
  );
  TestValidator.equals(
    "shipping method updatedAt should match configured shipping method",
    tracking.shippingMethod.updatedAt,
    shippingMethod.updated_at,
  );

  // 19. Validate shippingAddress snapshot
  const snapshot = tracking.shippingAddress;
  TestValidator.equals(
    "shipping address id should match order shipping address id",
    snapshot.id,
    orderShippingAddress.id,
  );
  TestValidator.equals(
    "recipientName should match snapshot",
    snapshot.recipientName,
    orderShippingAddress.recipient_name,
  );
  TestValidator.equals(
    "line1 should match snapshot",
    snapshot.line1,
    orderShippingAddress.line1,
  );
  TestValidator.equals(
    "line2 should match snapshot",
    snapshot.line2,
    orderShippingAddress.line2 ?? null,
  );
  TestValidator.equals(
    "city should match snapshot",
    snapshot.city,
    orderShippingAddress.city,
  );
  TestValidator.equals(
    "postalCode should match snapshot",
    snapshot.postalCode,
    orderShippingAddress.postal_code,
  );
  TestValidator.equals(
    "countryCode should match snapshot",
    snapshot.countryCode,
    orderShippingAddress.country_code,
  );
  TestValidator.equals(
    "region should match snapshot",
    snapshot.region,
    orderShippingAddress.region ?? null,
  );
  TestValidator.equals(
    "phoneNumber should match snapshot",
    snapshot.phoneNumber,
    orderShippingAddress.phone_number ?? null,
  );
  TestValidator.equals(
    "shipping address createdAt should match snapshot",
    snapshot.createdAt,
    orderShippingAddress.created_at,
  );
  TestValidator.equals(
    "shipping address updatedAt should match snapshot",
    snapshot.updatedAt,
    orderShippingAddress.updated_at,
  );
  TestValidator.equals(
    "shipping address deletedAt should match snapshot",
    snapshot.deletedAt,
    orderShippingAddress.deleted_at ?? null,
  );

  // 20. Validate events list
  const events: IShoppingMallShipmentTrackingEvent[] = tracking.events;
  TestValidator.equals(
    "tracking events length should equal number of created events",
    events.length,
    createdEvents.length,
  );

  // Ensure sorted by eventTime ascending
  for (let i = 1; i < events.length; i++) {
    TestValidator.predicate(
      `event[${i}] should have eventTime >= previous`,
      new Date(events[i].eventTime).getTime() >=
        new Date(events[i - 1].eventTime).getTime(),
    );
  }

  // Check each event matches payload in order of ascending event_time
  const sortedPayloads = [...eventPayloads].sort((a, b) =>
    a.event_time.localeCompare(b.event_time),
  );

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const expected = sortedPayloads[i];

    TestValidator.equals(
      `event[${i}] type should match`,
      ev.eventType,
      expected.event_type,
    );
    TestValidator.equals(
      `event[${i}] status should match`,
      ev.status,
      expected.status ?? null,
    );
    TestValidator.equals(
      `event[${i}] description should match`,
      ev.description,
      expected.description ?? null,
    );

    TestValidator.predicate(
      `event[${i}] id should be non-empty uuid string`,
      typeof ev.id === "string" && ev.id.length > 0,
    );
  }

  // 21. Negative test - another customer should not access tracking
  const otherCustomerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://customer.shoppingmall.test/join2" as string &
      tags.Format<"uri">,
    referrer: "https://customer.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomer);

  const otherCustomerLoginBody = {
    email: otherCustomer.email,
    password: otherCustomerJoinBody.password,
    ip: null,
    href: "https://customer.shoppingmall.test/login2" as string &
      tags.Format<"uri">,
    referrer: "https://customer.shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const otherCustomerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: otherCustomerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(otherCustomerLoggedIn);

  await TestValidator.error(
    "non-owning customer should not access shipment tracking",
    async () => {
      await api.functional.shoppingMall.customer.shipments.tracking.at(
        connection,
        {
          shipmentCode,
        },
      );
    },
  );
}
