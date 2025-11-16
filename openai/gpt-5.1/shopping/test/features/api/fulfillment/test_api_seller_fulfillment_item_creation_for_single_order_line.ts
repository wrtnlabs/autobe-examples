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
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";

export async function test_api_seller_fulfillment_item_creation_for_single_order_line(
  connection: api.IConnection,
) {
  // 1. Register platform admin, seller, and customer actors via join APIs.
  const platformAdminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test.com`,
    name: RandomGenerator.name(2),
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.com/join",
    referrer: "https://admin.test.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test.com`,
    password: "SellerPass123!",
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const customerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@customer.test.com`,
    password: "CustomerPass123!",
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://shop.test.com/join",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. As platform admin, create a category tree and a brand.
  const categoryTreeCreateBody = {
    code: `tree-${RandomGenerator.alphaNumeric(8)}`,
    name: "Main Catalog Tree",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: categoryTreeCreateBody },
    );
  typia.assert(categoryTree);

  const brandCreateBody = {
    name: `Brand ${RandomGenerator.name(1)}`,
    slug: `brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.test.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 3. As seller, create a multi-SKU product with one option type and value, then a SKU.
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  const productCode = `prod-${RandomGenerator.alphaNumeric(10)}`;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "Fulfillment Test Product",
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.test.com/product.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  const optionTypeCreateBody = {
    name: "Size",
    display_name: "Size",
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductOptionType.ICreate;

  const optionType: IShoppingMallProductOptionType =
    await api.functional.shoppingMall.seller.products.optionTypes.create(
      connection,
      {
        productCode,
        body: optionTypeCreateBody,
      },
    );
  typia.assert(optionType);

  const optionValueCreateBody = {
    value: "M",
    display_name: "Medium",
    display_order: 0 as number & tags.Type<"int32">,
    is_active: true,
  } satisfies IShoppingMallProductOptionValue.ICreate;

  const optionValue: IShoppingMallProductOptionValue =
    await api.functional.shoppingMall.seller.products.optionTypes.values.create(
      connection,
      {
        productCode,
        productOptionTypeId: optionType.id,
        body: optionValueCreateBody,
      },
    );
  typia.assert(optionValue);

  const skuCode = `sku-${RandomGenerator.alphaNumeric(10)}`;

  const skuCreateBody = {
    code: skuCode,
    name: "Fulfillment Test SKU M",
    listPrice: 100,
    salePrice: 100,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productCode,
      body: skuCreateBody,
    });
  typia.assert(sku);

  // 4. As seller, create an inventory item for the SKU with positive on_hand_quantity.
  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 5. As customer, create cart, add one item, and place an order.
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.test.com/login",
    referrer: "https://shop.test.com/landing",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoginAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoginAuthorized);

  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const customerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(customerCart);

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "Single line item for fulfillment test",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: customerCart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert(cartItem);

  const subtotal = 100;
  const discount = 0;
  const shipping = 0;
  const tax = 0;
  const grandTotal = subtotal - discount + shipping + tax;

  // Order requires address ids, but no address APIs are available in this SDK
  // snapshot. To keep the test compilable and focused on fulfillment, we
  // simulate address ids with random UUIDs, assuming backend accepts them.
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  const billingAddressId = typia.random<string & tags.Format<"uuid">>();

  const orderCreateBody = {
    customer_cart_id: customerCart.id,
    currency_code: "USD",
    items_subtotal_amount: subtotal,
    discount_total_amount: discount,
    shipping_total_amount: shipping,
    tax_total_amount: tax,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "Fulfillment single-line order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. As seller, create a fulfillment for a single order line with quantity 1.
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  const orderSummary: IShoppingMallOrder.ISummary = {
    id: order.id,
    order_number: order.order_code,
    customer: order.customer,
    placed_at: order.placed_at,
    status: order.order_status,
    payment_status: order.payment_status,
    total_amount: order.grand_total_amount,
    currency: order.currency_code,
    item_count: undefined,
    thumbnail_items: undefined,
  } satisfies IShoppingMallOrder.ISummary;
  typia.assert(orderSummary);

  // We do not have direct access to order line ids from this SDK snapshot,
  // so we simulate a single order_line_id with a random UUID while keeping
  // the business structure intact.
  const orderLineId = typia.random<string & tags.Format<"uuid">>();

  const fulfillmentOrderLineCreate: IShoppingMallFulfillmentOrderLine.ICreate =
    {
      order_line_id: orderLineId,
      quantity: 1 as number & tags.Type<"int32">,
    };

  const fulfillmentCreateBody = {
    order_line_fulfillments: [fulfillmentOrderLineCreate],
    carrier_code: "TEST-CARRIER",
    requested_ship_date: new Date().toISOString(),
    warehouse_code: "WH-1",
    notes: "Fulfillment for single order line",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId: order.id,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  // 7. As seller, create a shipment for the order and associate it to a seller segment.
  // The full order seller segment graph is not exposed by this SDK snapshot,
  // so we simulate a seller segment id with a random UUID while respecting
  // the DTO type.
  const sellerSegmentId = typia.random<string & tags.Format<"uuid">>();

  const shipmentCreateBody = {
    order_seller_segment_id: sellerSegmentId,
    shipment_status: "pending",
    carrier_name: undefined,
    carrier_service_level: undefined,
    tracking_number: undefined,
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId: order.id,
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 8. Create a fulfillment item linking the fulfillment to the shipment.
  const fulfillmentItemCreateBody = {
    shipment_id: shipment.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallFulfillmentItem.ICreate;

  const fulfillmentItem: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.seller.fulfillments.items.create(
      connection,
      {
        fulfillmentId: fulfillment.id,
        body: fulfillmentItemCreateBody,
      },
    );
  typia.assert(fulfillmentItem);

  // 9. Validate response for correct linkage and quantity.
  TestValidator.equals(
    "fulfillment item should reference the parent fulfillment",
    fulfillmentItem.fulfillment_id,
    fulfillment.id,
  );

  TestValidator.equals(
    "fulfillment item should reference the created shipment",
    fulfillmentItem.shipment_id,
    shipment.id,
  );

  TestValidator.equals(
    "fulfillment item quantity should match requested quantity",
    fulfillmentItem.quantity,
    fulfillmentItemCreateBody.quantity,
  );

  // Indirect business guards validation: same order id is used across
  // fulfillment and shipment linkage in this scenario.
  TestValidator.predicate(
    "order id used for fulfillment and shipment is identical",
    fulfillment.orderId === order.id && shipment.order.id === order.id,
  );
}
