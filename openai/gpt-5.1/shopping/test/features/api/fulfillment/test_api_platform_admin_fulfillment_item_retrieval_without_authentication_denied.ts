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

/**
 * Ensure anonymous callers cannot retrieve platform-admin fulfillment items.
 *
 * Business purpose: Platform admin fulfillment items expose low-level logistics
 * linkage between fulfillments and shipments (quantities, shipment ids, etc.)
 * and must never be retrievable without authentication. This test builds a
 * realistic upstream state (catalog, cart, order, fulfillment, shipment,
 * fulfillment item) and then verifies that unauthenticated access to the item
 * lookup endpoint is rejected.
 *
 * High level steps:
 *
 * 1. Register a platform administrator (join) so we can perform privileged setup
 *    for catalog and fulfillment.
 * 2. Register and log in a customer to own the cart and order.
 * 3. As platform admin, create minimal catalog primitives:
 *
 *    - Category tree
 *    - Brand
 *    - Product tied to some seller id
 *    - One SKU for that product
 * 4. As customer, create a customer cart and add the SKU as a cart item.
 * 5. As customer, create an order from the cart, providing reasonable monetary
 *    snapshots and dummy address snapshot ids.
 * 6. As platform admin, create a fulfillment for that order.
 * 7. As platform admin, create a shipment for that order.
 * 8. As platform admin, create a fulfillment item under the fulfillment,
 *    referencing the shipment so we have a real fulfillmentItemId.
 * 9. Construct an unauthenticated connection by copying the existing connection
 *    and setting headers to an empty object, without touching
 *    connection.headers afterward.
 * 10. Call GET
 *     /shoppingMall/platformAdmin/fulfillments/{fulfillmentId}/items/{fulfillmentItemId}
 *     using the unauthenticated connection.
 * 11. Wrap the call in TestValidator.error (with await and async callback) to
 *     assert that some error is thrown, without asserting any concrete HTTP
 *     status code or inspecting the error body.
 */
export async function test_api_platform_admin_fulfillment_item_retrieval_without_authentication_denied(
  connection: api.IConnection,
) {
  // 1. Platform admin join -> authenticated admin connection
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Customer join & login -> authenticated customer connection
  const customerEmail = `customer+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerJoinBody: IShoppingMallCustomerAuth.IJoin = {
    email: customerEmail,
    password: "P@ssw0rd!",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://shop.example.com/",
  };
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody: IShoppingMallCustomerAuth.ILogin = {
    email: customerEmail,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "e2e-test-agent",
  };
  const customerAuthorizedAfterLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedAfterLogin);

  // 3. Catalog setup as platform admin: category tree, brand, product, SKU
  // Category tree
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog",
    description: "E2E test category tree",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  // Brand
  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: "E2E brand for fulfillment auth test",
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // Seller: platform admin cannot act as seller; create a seller actor
  const sellerEmail = `seller+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerJoinBody = {
    email: sellerEmail,
    password: "P@ssw0rd!",
    storeName: `Store ${RandomGenerator.name(1)}`,
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Product under seller
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode as string & tags.MinLength<1>,
    name: `Product ${RandomGenerator.name(1)}` as string & tags.MinLength<1>,
    short_description: "Test product for auth scenario",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // SKU
  const skuCreateBody = {
    code: `sku-${RandomGenerator.alphaNumeric(10)}`,
    name: `SKU ${RandomGenerator.name(1)}`,
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
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 4. Customer cart and cart item
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;
  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(cart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1,
    note: "auth test line",
  } satisfies IShoppingMallCustomerCartItem.ICreate;
  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  // 5. Customer order creation
  const currencyCode = cart.currency_code;
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 9;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: currencyCode,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Please deliver quickly",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Fulfillment for the order, using random order_line_id in simulator context
  const fulfillmentOrderLineCreate: IShoppingMallFulfillmentOrderLine.ICreate =
    {
      order_line_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1,
    };
  const fulfillmentCreateBody = {
    order_line_fulfillments: [fulfillmentOrderLineCreate],
    carrier_code: "TEST_CARRIER",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-TEST",
    notes: "Auto-generated fulfillment for auth test",
  } satisfies IShoppingMallFulfillment.ICreate;
  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  // 7. Shipment for the order
  const orderSellerSegmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentCreateBody = {
    order_seller_segment_id: orderSellerSegmentId,
    shipment_status: "ready_to_ship",
    carrier_name: "Test Carrier",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 8. Fulfillment item under the fulfillment referencing the shipment
  const fulfillmentItemCreateBody = {
    shipment_id: shipment.id,
    quantity: 1,
  } satisfies IShoppingMallFulfillmentItem.ICreate;
  const fulfillmentItem: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.platformAdmin.fulfillments.items.create(
      connection,
      {
        fulfillmentId: fulfillment.id,
        body: fulfillmentItemCreateBody,
      },
    );
  typia.assert(fulfillmentItem);

  // 9. Build unauthenticated connection clone (do not touch original headers afterward)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 10. Attempt to GET fulfillment item without authentication and assert failure
  await TestValidator.error(
    "unauthenticated platformAdmin fulfillment item GET must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fulfillments.items.at(
        unauthenticatedConnection,
        {
          fulfillmentId: fulfillment.id,
          fulfillmentItemId: fulfillmentItem.id,
        },
      );
    },
  );
}
