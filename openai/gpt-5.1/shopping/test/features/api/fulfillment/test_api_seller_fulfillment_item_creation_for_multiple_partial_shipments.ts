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

export async function test_api_seller_fulfillment_item_creation_for_multiple_partial_shipments(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and logs in to set up catalog prerequisites (brand, category tree if needed)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const platformAdminLoginBody = {
    email: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Create a brand used for the product
  const brandBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Seller joins and logs in
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 4. Platform admin creates a category tree
  const categoryTreeBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 5. Seller creates a product with single SKU support
  const productCode = RandomGenerator.alphaNumeric(12);

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-primary.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals("product code must match", product.code, productCode);

  // 6. Seller creates an option type and a single option value
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
    value: "one-size",
    display_name: "One Size",
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

  // 7. Seller creates a SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(12);

  const skuCreateBody = {
    code: skuCode,
    name: `${product.name} - One Size`,
    listPrice: 100,
    salePrice: 80,
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

  // 8. Seller creates inventory item for the SKU (on_hand_quantity >= 5)
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

  // 9. Customer joins and logs in
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/landing",
    userAgent: "Mozilla/5.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 10. Customer creates a cart
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
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 11. Customer adds SKU (qty=5) to cart
  const orderedQuantity = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: orderedQuantity,
    note: "Test multi-shipment fulfillment",
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

  TestValidator.equals(
    "cart item quantity must equal ordered quantity",
    cartItem.quantity,
    orderedQuantity,
  );

  // 12. Customer creates order from cart.
  const itemsSubtotalAmount = skuCreateBody.salePrice * orderedQuantity;
  const discountTotalAmount = 0;
  const shippingTotalAmount = 0;
  const taxTotalAmount = 0;
  const grandTotalAmount =
    itemsSubtotalAmount -
    discountTotalAmount +
    shippingTotalAmount +
    taxTotalAmount;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotalAmount,
    discount_total_amount: discountTotalAmount,
    shipping_total_amount: shippingTotalAmount,
    tax_total_amount: taxTotalAmount,
    grand_total_amount: grandTotalAmount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Test order for multi-shipment fulfillment",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  const orderId: string & tags.Format<"uuid"> = order.id as string &
    tags.Format<"uuid">;

  // Synthetic seller segment and order line identifiers (no read APIs available)
  const sellerSegmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderLineId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 13. Seller logs in again to operate on order/fulfillment context
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerReLogin);

  // 14. Seller creates a fulfillment for this order.
  const fulfillmentCreateBody = {
    order_line_fulfillments: [
      {
        order_line_id: orderLineId,
        quantity: orderedQuantity,
      } satisfies IShoppingMallFulfillmentOrderLine.ICreate,
    ],
    carrier_code: "UPS",
    requested_ship_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    warehouse_code: "WH-1",
    notes: "Fulfillment for multi-shipment test",
  } satisfies IShoppingMallFulfillment.ICreate;

  const fulfillment: IShoppingMallFulfillment =
    await api.functional.shoppingMall.seller.orders.fulfillments.create(
      connection,
      {
        orderId,
        body: fulfillmentCreateBody,
      },
    );
  typia.assert(fulfillment);

  // 15. Create the first shipment for this order
  const firstShipmentCreateBody = {
    order_seller_segment_id: sellerSegmentId,
    shipment_status: "pending",
    carrier_name: "UPS",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const firstShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId,
      body: firstShipmentCreateBody,
    });
  typia.assert(firstShipment);

  // 16. Seller creates first fulfillment item (qty 2) linked to first shipment
  const firstPartialQuantity = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const firstFulfillmentItemBody = {
    shipment_id: firstShipment.id,
    quantity: firstPartialQuantity,
  } satisfies IShoppingMallFulfillmentItem.ICreate;

  const firstFulfillmentItem: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.seller.fulfillments.items.create(
      connection,
      {
        fulfillmentId: fulfillment.id as string & tags.Format<"uuid">,
        body: firstFulfillmentItemBody,
      },
    );
  typia.assert(firstFulfillmentItem);

  TestValidator.equals(
    "first fulfillment item should reference parent fulfillment",
    firstFulfillmentItem.fulfillment_id,
    fulfillment.id,
  );
  TestValidator.equals(
    "first fulfillment item should reference first shipment",
    firstFulfillmentItem.shipment_id,
    firstShipment.id,
  );
  TestValidator.equals(
    "first fulfillment item quantity should equal first partial quantity",
    firstFulfillmentItem.quantity,
    firstPartialQuantity,
  );

  // 17. Create the second shipment for the same order
  const secondShipmentCreateBody = {
    order_seller_segment_id: sellerSegmentId,
    shipment_status: "pending",
    carrier_name: "UPS",
    carrier_service_level: "standard",
    tracking_number: RandomGenerator.alphaNumeric(12),
    shipped_at: undefined,
  } satisfies IShoppingMallShipment.ICreate;

  const secondShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.orders.shipments.create(connection, {
      orderId,
      body: secondShipmentCreateBody,
    });
  typia.assert(secondShipment);

  // 18. Seller creates second fulfillment item (qty 3) linked to second shipment
  const secondPartialQuantity = (orderedQuantity -
    firstPartialQuantity) as number & tags.Type<"int32"> & tags.Minimum<1>;

  const secondFulfillmentItemBody = {
    shipment_id: secondShipment.id,
    quantity: secondPartialQuantity,
  } satisfies IShoppingMallFulfillmentItem.ICreate;

  const secondFulfillmentItem: IShoppingMallFulfillmentItem =
    await api.functional.shoppingMall.seller.fulfillments.items.create(
      connection,
      {
        fulfillmentId: fulfillment.id as string & tags.Format<"uuid">,
        body: secondFulfillmentItemBody,
      },
    );
  typia.assert(secondFulfillmentItem);

  TestValidator.equals(
    "second fulfillment item should reference parent fulfillment",
    secondFulfillmentItem.fulfillment_id,
    fulfillment.id,
  );
  TestValidator.equals(
    "second fulfillment item should reference second shipment",
    secondFulfillmentItem.shipment_id,
    secondShipment.id,
  );
  TestValidator.equals(
    "second fulfillment item quantity should equal second partial quantity",
    secondFulfillmentItem.quantity,
    secondPartialQuantity,
  );

  const cumulativeFulfilledQuantity =
    firstFulfillmentItem.quantity + secondFulfillmentItem.quantity;

  TestValidator.equals(
    "cumulative fulfillment item quantity should equal ordered quantity",
    cumulativeFulfilledQuantity,
    orderedQuantity,
  );

  // 19. Attempt to create an over-fulfilling item (qty 1) and expect business error
  const overFulfillmentItemBody = {
    shipment_id: secondShipment.id,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallFulfillmentItem.ICreate;

  await TestValidator.error(
    "over-fulfilling fulfillment item should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.fulfillments.items.create(
        connection,
        {
          fulfillmentId: fulfillment.id as string & tags.Format<"uuid">,
          body: overFulfillmentItemBody,
        },
      );
    },
  );
}
