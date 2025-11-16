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
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

export async function test_api_platform_admin_erases_specific_tracking_event_from_shipment_history(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authorized session
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test/join",
    referrer: "https://admin.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Register seller
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "SellerPass123!",
    storeName: `Store-${RandomGenerator.alphabets(6)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 3. Register customer
  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.test/join",
    referrer: "https://customer.test/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. As platform admin, create a category tree (optional but realistic)
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphabets(6)}`,
    name: "Default Catalog Tree",
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

  // 5. As platform admin, create a brand
  const brandBody = {
    name: `Brand-${RandomGenerator.alphabets(6)}`,
    slug: `brand-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.test/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 6. Switch to seller context is already handled via auth.seller.join token
  //    Create seller-owned product
  const productCode = `prod-${RandomGenerator.alphabets(8)}`;

  const productBody = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Test Shippable Product",
    short_description: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: false,
    primary_image_uri: "https://cdn.test/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 7. Create SKU for the product
  const skuCode = `sku-${RandomGenerator.alphabets(8)}`;
  const listPrice = 10_000;
  const salePrice = 9_000;
  const skuBody = {
    code: skuCode,
    name: "Default SKU",
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuBody,
    });
  typia.assert(sku);

  // 8. Create inventory item for the SKU
  const inventoryBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryBody,
    });
  typia.assert(inventoryItem);

  // 9. Switch to customer context already set from join; create a customer cart
  const cartBody = {
    currency_code: "KRW",
    region_code: "KR-Seoul",
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

  // 10. Add item to cart
  const cartItemBody = {
    skuId: sku.id,
    quantity: 1,
    note: "Test line item for shipment tracking",
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

  // 11. Create order from cart
  const itemsSubtotal = salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 12. Create shipment for the order
  const orderId = order.id;
  const orderSellerSegmentId = typia.random<string & tags.Format<"uuid">>();

  const shipmentBody = {
    order_seller_segment_id: orderSellerSegmentId,
    shipment_status: "pending",
    carrier_name: "TestCarrier",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 13. Ensure we are authenticated as platform admin before tracking events
  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.test/login",
    referrer: "https://admin.test/",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 14. Create first tracking event (shipped)
  const now = new Date();
  const event1Body = {
    status: "shipped",
    carrier_status_code: "LABEL_CREATED",
    location_description: "Seoul Fulfillment Center",
    carrier_raw_message: "Shipment label created",
    occurred_at: now.toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const event1: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: event1Body,
      },
    );
  typia.assert(event1);

  // 15. Create second tracking event (in_transit)
  const later = new Date(now.getTime() + 60_000);
  const event2Body = {
    status: "in_transit",
    carrier_status_code: "IN_TRANSIT",
    location_description: "On the way to customer",
    carrier_raw_message: "Shipment departed facility",
    occurred_at: later.toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  const event2: IShoppingMallShipmentTrackingEvent =
    await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
      connection,
      {
        shipmentId: shipment.id,
        body: event2Body,
      },
    );
  typia.assert(event2);

  // 16. Basic validations on created tracking events
  TestValidator.predicate(
    "both tracking events belong to the same shipment",
    event1.shipment_id === shipment.id && event2.shipment_id === shipment.id,
  );

  TestValidator.predicate(
    "tracking events have distinct ids",
    event1.id !== event2.id,
  );

  TestValidator.predicate(
    "tracking events have different statuses",
    event1.status !== event2.status,
  );

  // 17. Erase the second tracking event as platform admin
  await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.erase(
    connection,
    {
      shipmentId: shipment.id,
      trackingEventId: event2.id,
    },
  );

  // 18. Attempting to erase the same tracking event again should fail
  await TestValidator.error(
    "erasing the same tracking event twice should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.erase(
        connection,
        {
          shipmentId: shipment.id,
          trackingEventId: event2.id,
        },
      );
    },
  );
}
