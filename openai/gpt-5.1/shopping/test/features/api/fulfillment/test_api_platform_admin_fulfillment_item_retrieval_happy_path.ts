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
 * Validate that a platform admin can retrieve a fulfillment item created for an
 * order.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Admin creates category tree and brand.
 * 3. Admin creates a product for a seller and a SKU under that product.
 * 4. Customer joins and logs in.
 * 5. Customer creates a cart and adds the SKU as a cart item.
 * 6. Customer places an order from the cart.
 * 7. Platform admin creates a fulfillment for the order.
 * 8. Platform admin creates a shipment for the order.
 * 9. Platform admin creates a fulfillment item linking the fulfillment and
 *    shipment.
 * 10. Platform admin retrieves the fulfillment item and verifies identifiers and
 *     quantity.
 */
export async function test_api_platform_admin_fulfillment_item_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Platform admin login (explicit swap to ensure token set and flow exercised)
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/join-complete",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Admin creates category tree
  const categoryTreeBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeBody },
    );
  typia.assert(categoryTree);

  // 3. Admin creates brand
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: `brand-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3-1. Seller join to own the product
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 1 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3-2. Create product under the seller and brand
  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;
  const productBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.shoppingmall.test/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      { body: productBody },
    );
  typia.assert(product);

  // 3-3. Create SKU under product
  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;
  const skuBody = {
    code: skuCode,
    name: RandomGenerator.paragraph({ sentences: 1 }),
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

  // 4. Customer joins and logs in
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.test/join",
    referrer: "https://shoppingmall.test/home",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.test/login",
    referrer: "https://shoppingmall.test/join-complete",
    userAgent: "E2E-Test-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 5. Customer creates cart
  const cartBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      testcase: "platform_admin_fulfillment_item_retrieval_happy_path",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: cartBody },
    );
  typia.assert(cart);

  // 6. Customer adds SKU as cart item
  const cartItemBody = {
    skuId: sku.id,
    quantity: 2,
    note: "E2E test cart item",
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

  // 7. Customer places an order from the cart
  const itemsSubtotal = 160; // 2 * 80
  const discountTotal = 0;
  const shippingTotal = 10;
  const taxTotal = 15;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

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
    customer_note: "E2E test order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 8. Platform admin creates a fulfillment for the order
  const orderLineIdForFulfillment: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const fulfillmentOrderLine: IShoppingMallFulfillmentOrderLine.ICreate = {
    order_line_id: orderLineIdForFulfillment,
    quantity: 1,
  };

  const fulfillmentBody = {
    order_line_fulfillments: [fulfillmentOrderLine],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-E2E",
    notes: "E2E fulfillment",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.platformAdmin.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentBody,
      },
    );
  typia.assert(fulfillment);

  // 9. Platform admin creates a shipment for the order
  const orderSellerSegmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const shipmentBody = {
    order_seller_segment_id: orderSellerSegmentId,
    shipment_status: "pending",
    carrier_name: "UPS",
    carrier_service_level: "ground",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentBody,
    });
  typia.assert(shipment);

  // 10. Platform admin creates a fulfillment item linking fulfillment and shipment
  const fulfillmentItemQuantity = 1;
  const fulfillmentItemBody = {
    shipment_id: shipment.id,
    quantity: fulfillmentItemQuantity,
  } satisfies IShoppingMallFulfillmentItem.ICreate;

  const fulfillmentItem: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.platformAdmin.fulfillments.items.create(
      connection,
      {
        fulfillmentId: fulfillment.id,
        body: fulfillmentItemBody,
      },
    );
  typia.assert(fulfillmentItem);

  // 11. Platform admin retrieves the fulfillment item and validates it
  const retrieved: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.platformAdmin.fulfillments.items.at(
      connection,
      {
        fulfillmentId: fulfillment.id,
        fulfillmentItemId: fulfillmentItem.id,
      },
    );
  typia.assert(retrieved);

  TestValidator.equals(
    "retrieved fulfillment item id matches created id",
    retrieved.id,
    fulfillmentItem.id,
  );
  TestValidator.equals(
    "retrieved fulfillment_id matches parent fulfillment",
    retrieved.fulfillment_id,
    fulfillment.id,
  );
  TestValidator.equals(
    "retrieved shipment_id matches shipment",
    retrieved.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "retrieved quantity matches creation quantity",
    retrieved.quantity,
    fulfillmentItemQuantity,
  );
}
