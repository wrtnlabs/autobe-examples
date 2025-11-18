import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentEvent";
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
 * Verify shipment events listing filtering and pagination behavior.
 *
 * Business goal
 *
 * - Ensure clients can fetch a shipment's event timeline in both chronological
 *   and reverse-chronological order while combining type and time filters with
 *   consistent pagination metadata.
 *
 * High-level flow
 *
 * 1. Create admin, seller, and customer actors, then set up all master data
 *    (country, region, shipping method, payment method, category, SKU inventory
 *    state).
 * 2. As seller+customer, create a product, SKU, cart, order, and an admin-side
 *    shipment for that order so we have a real shipmentCode.
 * 3. Create ~18 shipment events for that shipment, with varied event_type and
 *    event_time values across multiple hours/days.
 * 4. Exercise PATCH /shoppingMall/shipments/{shipmentCode}/events with different
 *    combinations of page/limit/eventTypes/time window/sortDirection and
 *    validate pagination and ordering semantics.
 */
export async function test_api_shipment_events_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin, seller, customer join + their logins will be driven by SDK.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 2. Admin creates country, region, shipping method, payment method, category, sku inventory state.
  const country: IShoppingMallCountry =
    await api.functional.shoppingMall.admin.countries.create(connection, {
      body: {
        country_code: "KR",
        name_en: "Korea",
        phone_code: "+82",
        is_active: true,
        sort_order: 1 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCountry.ICreate,
    });
  typia.assert(country);

  const region: IShoppingMallRegion =
    await api.functional.shoppingMall.admin.countries.regions.create(
      connection,
      {
        countryCode: country.country_code,
        body: {
          code: "SEOUL",
          name_en: "Seoul",
          region_type: "city",
          is_active: true,
          sort_order: 1 as number & tags.Type<"int32">,
        } satisfies IShoppingMallRegion.ICreate,
      },
    );
  typia.assert(region);

  const shippingMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: {
        method_code: "STANDARD",
        display_name: "Standard Shipping",
        service_level_description: "2-3 business days",
      } satisfies IShoppingMallShippingMethod.ICreate,
    });
  typia.assert(shippingMethod);

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: {
        code: "CARD",
        display_name: "Credit Card",
        description: "Card payment",
        provider_type: "card_processor",
        allowed_currencies: null,
        allowed_countries: null,
        min_amount: null,
        max_amount: null,
        status: "active",
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: null,
        slug: "electronics",
        name_en: "Electronics",
        description_en: "Electronics category",
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: {
          code: "in_stock",
          name: "In Stock",
          description: "Available for sale",
          is_purchasable: true,
        } satisfies IShoppingMallSkuInventoryState.ICreate,
      },
    );
  typia.assert(inventoryState);

  // 3. Seller creates product and SKU.
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerJoinBody.email,
      password: sellerJoinBody.password,
      ip: null,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: "BrandX",
        model_name: "ModelY",
        status: "active",
        primary_image_uri: "https://cdn.example.com/product.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        code: RandomGenerator.alphaNumeric(6) as string &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        barcode: null,
        status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
        price: 100,
        original_price: null,
        inventory_quantity: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        low_stock_threshold: null,
        shopping_mall_sku_inventory_state_id: inventoryState.id,
        attribute_value_ids: [],
        external_ids: [],
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // Admin links product to category.
  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);

  // 4. Customer login, create address, cart, order.
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerJoinBody.email,
      password: customerJoinBody.password,
      ip: null,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/landing",
    } satisfies IShoppingMallCustomerLogin.IRequest,
  });

  const address: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          shopping_mall_country_id: country.id,
          shopping_mall_region_id: region.id,
          recipient_name: RandomGenerator.name(2),
          line1: "123 Main St",
          line2: null,
          city: "Seoul",
          postal_code: "12345",
          phone_number: RandomGenerator.mobile(),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        actor_type: "customer",
        status: "active",
        currency_code: "KRW",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        cart_id: cart.id,
        currency_code: "KRW",
        items: [
          {
            shopping_mall_sku_id: sku.id,
            quantity: 2 as number & tags.Type<"int32">,
          },
        ] satisfies IShoppingMallOrderItem.ICreate[],
        shipping_address_id: address.id,
        shipping_address_snapshot: null,
        shipping_method_id: shippingMethod.id,
        payment_method_id: paymentMethod.id,
        buyer_memo: null,
        platform_note: null,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Admin creates a shipment for the order.
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderCode: order.order_code,
        body: {
          orderCode: undefined,
          shippingAddressId: address.id,
          shippingMethodId: shippingMethod.id,
          shippingStatus: "pending",
          carrierName: null,
          trackingNumber: null,
          expectedShipDate: null,
          shipmentItems: [
            {
              shopping_mall_order_item_id: order.items[0].id,
              shopping_mall_sku_id: sku.id,
              quantity: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
            },
          ],
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 6. Create multiple shipment events for that shipment.
  const baseTime = new Date();
  const events: IShoppingMallShipmentEvent[] = [];
  const types = ["created", "status_change", "carrier_scan"] as const;
  const totalEvents = 18;
  for (let i = 0; i < totalEvents; i++) {
    const eventTime = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
    const event: IShoppingMallShipmentEvent =
      await api.functional.shoppingMall.shipments.events.create(connection, {
        shipmentCode: shipment.shipment_code,
        body: {
          event_type: types[i % types.length],
          status: i % 3 === 0 ? "in_transit" : null,
          description: `event-${i}`,
          event_time: eventTime.toISOString(),
        } satisfies IShoppingMallShipmentEvent.ICreate,
      });
    typia.assert(event);
    events.push(event);
  }

  // Sort local copy by event_time ascending for expectations.
  const sortedAsc = [...events].sort((a, b) =>
    a.event_time < b.event_time ? -1 : a.event_time > b.event_time ? 1 : 0,
  );

  const limit = 5;

  // 7. Page 1 asc without filters.
  const page1: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 1,
        limit,
        eventTypes: undefined,
        status: null,
        fromEventTime: null,
        toEventTime: null,
        sortDirection: "asc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(page1);

  TestValidator.equals(
    "page1 current page",
    page1.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals("page1 limit", page1.pagination.limit, limit);
  TestValidator.equals(
    "page1 total records",
    page1.pagination.records,
    totalEvents,
  );
  TestValidator.equals("page1 data length", page1.data.length, limit);

  // Verify ascending order and positions.
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `page1 ascending order index ${i}`,
      page1.data[i - 1].event_time <= page1.data[i].event_time,
    );
  }
  TestValidator.equals(
    "page1 first is earliest",
    page1.data[0].event_time,
    sortedAsc[0].event_time,
  );
  TestValidator.equals(
    "page1 fifth is 5th earliest",
    page1.data[4].event_time,
    sortedAsc[4].event_time,
  );

  // 8. Page 2 asc without filters.
  const page2: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 2,
        limit,
        eventTypes: undefined,
        status: null,
        fromEventTime: null,
        toEventTime: null,
        sortDirection: "asc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page2 current page",
    page2.pagination.current,
    2 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "page2 length is <= limit",
    page2.data.length <= limit,
  );

  const ids1 = new Set(page1.data.map((e) => e.id));
  const ids2 = new Set(page2.data.map((e) => e.id));
  for (const id of ids2) {
    TestValidator.predicate(
      "no overlap between page1 and page2",
      !ids1.has(id),
    );
  }

  const combined = [...page1.data, ...page2.data];
  for (let i = 1; i < combined.length; i++) {
    TestValidator.predicate(
      `combined ascending order index ${i}`,
      combined[i - 1].event_time <= combined[i].event_time,
    );
  }

  // 9. Filter by eventTypes = ["status_change"].
  const statusChangeType = "status_change";
  const statusChangeEvents = sortedAsc.filter(
    (e) => e.event_type === statusChangeType,
  );

  const statusPage: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 1,
        limit,
        eventTypes: [statusChangeType],
        status: null,
        fromEventTime: null,
        toEventTime: null,
        sortDirection: "asc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(statusPage);

  for (const ev of statusPage.data) {
    TestValidator.equals(
      "only status_change events",
      ev.event_type,
      statusChangeType,
    );
  }
  TestValidator.equals(
    "status_change total records",
    statusPage.pagination.records,
    statusChangeEvents.length,
  );
  const expectedStatusPages =
    statusChangeEvents.length === 0
      ? 0
      : Math.ceil(statusChangeEvents.length / limit);
  TestValidator.equals(
    "status_change total pages",
    statusPage.pagination.pages,
    expectedStatusPages,
  );

  // 10. Narrow time window between two consecutive events.
  const from = sortedAsc[5].event_time;
  const to = sortedAsc[8].event_time;
  const windowEvents = sortedAsc.filter(
    (e) => e.event_time >= from && e.event_time < to,
  );

  const windowPage: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 1,
        limit,
        eventTypes: undefined,
        status: null,
        fromEventTime: from,
        toEventTime: to,
        sortDirection: "asc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(windowPage);

  for (const ev of windowPage.data) {
    TestValidator.predicate(
      "event within time window",
      ev.event_time >= from && ev.event_time < to,
    );
  }
  TestValidator.equals(
    "window records count",
    windowPage.pagination.records,
    windowEvents.length,
  );

  // 11. Descending sort, pages 1 and 2.
  const descPage1: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 1,
        limit,
        eventTypes: undefined,
        status: null,
        fromEventTime: null,
        toEventTime: null,
        sortDirection: "desc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(descPage1);

  TestValidator.equals(
    "desc page1 first is latest",
    descPage1.data[0].event_time,
    sortedAsc[sortedAsc.length - 1].event_time,
  );
  for (let i = 1; i < descPage1.data.length; i++) {
    TestValidator.predicate(
      `desc page1 descending order index ${i}`,
      descPage1.data[i - 1].event_time >= descPage1.data[i].event_time,
    );
  }

  const descPage2: IPageIShoppingMallShipmentEvent.ISummary =
    await api.functional.shoppingMall.shipments.events.index(connection, {
      shipmentCode: shipment.shipment_code,
      body: {
        page: 2,
        limit,
        eventTypes: undefined,
        status: null,
        fromEventTime: null,
        toEventTime: null,
        sortDirection: "desc",
      } satisfies IShoppingMallShipmentEvent.IRequest,
    });
  typia.assert(descPage2);

  const descIds1 = new Set(descPage1.data.map((e) => e.id));
  const descIds2 = new Set(descPage2.data.map((e) => e.id));
  for (const id of descIds2) {
    TestValidator.predicate(
      "no overlap between desc page1 and page2",
      !descIds1.has(id),
    );
  }

  const combinedDesc = [...descPage1.data, ...descPage2.data];
  for (let i = 1; i < combinedDesc.length; i++) {
    TestValidator.predicate(
      `combined descending order index ${i}`,
      combinedDesc[i - 1].event_time >= combinedDesc[i].event_time,
    );
  }
}
