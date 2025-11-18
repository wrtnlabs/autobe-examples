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

export async function test_api_admin_shipment_event_delete_nonexistent_event(
  connection: api.IConnection,
) {
  // 1. Admin join to get admin session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: "AdminPassw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Seller join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinInput = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(sellerAuthorized);

  // 3. Customer join
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinInput = {
    email: customerEmail,
    password: "CustomerPassw0rd!",
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuthorized);

  // 4. As admin: create country
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

  // 5. As admin: create region under country
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

  // 6. As admin: create category
  const categoryCreateBody = {
    parent_id: null,
    slug: `category-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Electronics",
    description_en: "Electronic devices",
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 7. As admin: create SKU inventory state
  const skuInventoryStateCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(6)}`,
    name: "In Stock",
    description: "Regular sellable inventory",
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

  // 8. As admin: create shipping method
  const shippingMethodCreateBody = {
    method_code: `standard_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Shipping",
    service_level_description: "Standard ground shipping",
  } satisfies IShoppingMallShippingMethod.ICreate;
  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: shippingMethodCreateBody,
    });
  typia.assert(shippingMethod);

  // 9. As admin: create payment method
  const paymentMethodCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card",
    description: "Generic credit card payment",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: country.country_code,
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  // 10. Switch to seller: login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinInput.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 11. Seller: create product
  const productCreateBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    title: "Test Product",
    summary: "A test product for shipment event deletion",
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "TB-1000",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/test-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 12. Switch to admin: login (so admin can link product to category)
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 13. Admin: link product to category
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

  // 14. Switch back to seller to create SKU
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: null,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 50000,
    original_price: 60000,
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

  // 15. Switch to customer: login
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinInput.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;
  const customerLoginResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginResult);

  // 16. Customer: create cart
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

  // 17. Customer: create address
  const customerAddressCreateBody = {
    shopping_mall_country_id: country.id,
    shopping_mall_region_id: region.id,
    recipient_name: "Test Customer",
    line1: "123 Test Street",
    line2: null,
    city: "Seoul",
    postal_code: "06000",
    phone_number: RandomGenerator.mobile(),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customerAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customerLoginResult.id,
        body: customerAddressCreateBody,
      },
    );
  typia.assert(customerAddress);

  // 18. Customer: create order with one item using the SKU
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
    currency_code: "KRW",
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

  // 19. Customer: create order shipping address snapshot
  const orderShippingAddressCreateBody = {
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
        body: orderShippingAddressCreateBody,
      },
    );
  typia.assert(orderShippingAddress);

  // 20. Switch to admin: login again for order-side operations
  const adminLoginForOrder: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForOrder);

  // 21. Admin: create order price snapshot
  const priceSnapshotCreateBody = {
    item_subtotal_amount: order.grand_total_amount,
    item_discount_amount: 0,
    order_discount_amount: 0,
    shipping_fee_amount: 0,
    payment_surcharge_amount: 0,
    tax_amount: 0,
    grand_total_amount: order.grand_total_amount,
    is_final: true,
  } satisfies IShoppingMallOrderPriceSnapshot.ICreate;
  const priceSnapshot: IShoppingMallOrderPriceSnapshot =
    await api.functional.shoppingMall.admin.orders.priceSnapshots.create(
      connection,
      {
        orderCode: order.order_code,
        body: priceSnapshotCreateBody,
      },
    );
  typia.assert(priceSnapshot);

  // 22. Admin: create order status history (simulate paid/ready state)
  const nowIso = new Date().toISOString();
  const statusHistoryCreateBody = {
    from_status: order.current_status,
    to_status: "ready_to_ship",
    reason_code: "e2e-test",
    reason_detail: "Prepare shipment for nonexistent event deletion test",
    occurred_at: nowIso as string & tags.Format<"date-time">,
  } satisfies IShoppingMallOrderStatusHistory.ICreate;
  const statusHistory: IShoppingMallOrderStatusHistory =
    await api.functional.shoppingMall.admin.orders.statusHistories.create(
      connection,
      {
        orderCode: order.order_code,
        body: statusHistoryCreateBody,
      },
    );
  typia.assert(statusHistory);

  // 23. Admin: create shipment for the order with one item
  const shipmentItemCreate: IShoppingMallShipmentItem.ICreate = {
    shopping_mall_order_item_id: order.items[0].id,
    shopping_mall_sku_id: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const expectedShipDate = new Date();
  const shipmentCreateBody = {
    orderCode: order.order_code,
    shippingAddressId: orderShippingAddress.id,
    shippingMethodId: shippingMethod.id,
    shippingStatus: "preparing",
    carrierName: "TestCarrier",
    trackingNumber: null,
    expectedShipDate: expectedShipDate.toISOString() as string &
      tags.Format<"date-time">,
    shipmentItems: [shipmentItemCreate],
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: shipmentCreateBody,
      },
    );
  typia.assert(shipment);

  // 24. Create a real shipment event for the shipment
  const shipmentEventCreateBody = {
    event_type: "status_change",
    status: shipment.shipping_status,
    description: "Shipment created",
    event_time: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallShipmentEvent.ICreate;
  const realEvent: IShoppingMallShipmentEvent =
    await api.functional.shoppingMall.shipments.events.create(connection, {
      shipmentCode: shipment.shipment_code,
      body: shipmentEventCreateBody,
    });
  typia.assert(realEvent);

  // Keep a deep copy of the real event for later comparison
  const originalEventCopy = {
    id: realEvent.id,
    event_type: realEvent.event_type,
    status: realEvent.status ?? null,
    description: realEvent.description ?? null,
    event_time: realEvent.event_time,
    created_at: realEvent.created_at,
    shipment_code: realEvent.shipment.shipment_code,
  };

  // 25. Prepare nonexistent eventId (random UUID not used in any creation)
  const nonexistentEventId = typia.random<string & tags.Format<"uuid">>();

  // 26. Ensure we are admin before attempting deletion
  const adminLoginForErase: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginForErase);

  // 27. Attempt to erase nonexistent shipment event, expecting an error
  await TestValidator.error(
    "deleting nonexistent shipment event should fail",
    async () => {
      await api.functional.shoppingMall.admin.shipments.events.erase(
        connection,
        {
          shipmentCode: shipment.shipment_code,
          eventId: nonexistentEventId,
        },
      );
    },
  );

  // 28. Validate that our original event snapshot is unchanged on the client side
  TestValidator.equals(
    "original shipment event id remains same in client snapshot",
    realEvent.id,
    originalEventCopy.id,
  );
  TestValidator.equals(
    "original shipment event type remains same in client snapshot",
    realEvent.event_type,
    originalEventCopy.event_type,
  );
  TestValidator.equals(
    "original shipment event status remains same in client snapshot",
    realEvent.status ?? null,
    originalEventCopy.status,
  );
  TestValidator.equals(
    "original shipment event description remains same in client snapshot",
    realEvent.description ?? null,
    originalEventCopy.description,
  );
  TestValidator.equals(
    "original shipment event time remains same in client snapshot",
    realEvent.event_time,
    originalEventCopy.event_time,
  );
  TestValidator.equals(
    "original shipment event created_at remains same in client snapshot",
    realEvent.created_at,
    originalEventCopy.created_at,
  );
  TestValidator.equals(
    "original shipment code remains same in client snapshot",
    realEvent.shipment.shipment_code,
    originalEventCopy.shipment_code,
  );
}
