import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItemsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverview";
import type { IShoppingMallOrderItemsOverviewItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemsOverviewItem";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

export async function test_api_customer_order_items_overview_after_fulfillment_and_shipment(
  connection: api.IConnection,
) {
  // 1. Platform admin, seller, and customer authentication setup
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: "127.0.0.1",
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.test.com`,
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(5)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const customerJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.test.com`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Platform admin catalog setup
  // Switch back to platform admin via login to ensure token context
  const platformAdminLoginBody = {
    email: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com/home",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Main Catalog",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: categoryTreeBody,
      },
    );
  typia.assert(categoryTree);

  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(5)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.test.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: "Test Product" as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product-primary.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productBody,
      },
    );
  typia.assert(product);

  const skuBody = {
    code: `sku-${RandomGenerator.alphaNumeric(8)}`,
    name: "Default Variant",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode: product.code,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 3. Customer cart and order creation
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/home",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  const cartBody = {
    currency_code: sku.currency,
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartBody,
      },
    );
  typia.assert(cart);

  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const cartItemBody = {
    skuId: sku.id,
    quantity,
    note: "Test cart item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemBody,
      },
    );
  typia.assert(cartItem);

  const itemsSubtotal = sku.salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal + shippingTotal + taxTotal - discountTotal;

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 4. Seller fulfillment and shipment
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: "127.0.0.1",
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/home",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  const orderLineId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const fulfillmentOrderLine: IShoppingMallFulfillmentOrderLine.ICreate = {
    order_line_id: orderLineId,
    quantity: cartItem.quantity as number & tags.Type<"int32">,
  } satisfies IShoppingMallFulfillmentOrderLine.ICreate;

  const fulfillmentBody = {
    order_line_fulfillments: [fulfillmentOrderLine],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-1",
    notes: "Pack with care",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentBody,
      },
    );
  typia.assert(fulfillment);

  const shipmentBody = {
    order_seller_segment_id: typia.random<string & tags.Format<"uuid">>(),
    shipment_status: "shipped",
    carrier_name: "UPS",
    carrier_service_level: "GROUND",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: new Date().toISOString(),
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  const trackingEventBody = {
    status: "in_transit",
    carrier_status_code: "IT",
    location_description: "Distribution Center",
    carrier_raw_message: "Package departed facility",
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const trackingEvent: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.seller.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventBody,
      },
    );
  typia.assert(trackingEvent);

  // 5. Customer calls itemsOverview
  const customerLoginAgain: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAgain);

  const overview: IShoppingMallOrderItemsOverview =
    await api.functional.shoppingMall.customer.orders.itemsOverview.at(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(overview);

  // 6. Business validations
  TestValidator.equals(
    "order id matches in overview",
    overview.orderId,
    order.id,
  );

  TestValidator.equals(
    "itemsCount equals items.length",
    overview.itemsCount,
    overview.items.length,
  );

  TestValidator.equals(
    "currency matches order",
    overview.currency,
    order.currency_code,
  );

  TestValidator.predicate(
    "subtotalAmount is non-negative",
    overview.subtotalAmount >= 0,
  );

  TestValidator.predicate(
    "grandTotalAmount is positive",
    overview.grandTotalAmount > 0,
  );

  const totalLineAmount = overview.items.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  TestValidator.predicate(
    "sum of line totals is positive",
    totalLineAmount > 0,
  );

  for (const item of overview.items) {
    TestValidator.predicate("item quantity is at least 1", item.quantity >= 1);

    TestValidator.predicate("item unitPrice is positive", item.unitPrice > 0);

    TestValidator.predicate("item lineTotal is positive", item.lineTotal > 0);
  }

  const allPending = overview.items.every(
    (item) => item.fulfillmentStatus === "pending",
  );
  TestValidator.predicate(
    "at least one item has non-pending fulfillmentStatus",
    allPending === false,
  );

  // 7. Unauthenticated access should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to itemsOverview must be rejected",
    async () => {
      await api.functional.shoppingMall.customer.orders.itemsOverview.at(
        unauthConnection,
        {
          orderId: order.id,
        },
      );
    },
  );
}
