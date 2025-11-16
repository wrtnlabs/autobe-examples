import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFulfillment";
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
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";

/**
 * Verify that an order's fulfillment aggregates can be listed after creating a
 * single fulfillment.
 *
 * Business flow:
 *
 * 1. Platform admin joins and logs in.
 * 2. Admin creates a category tree and a brand.
 * 3. Admin creates a product owned by a seller and a SKU under that product.
 * 4. Seller joins and logs in, then creates an inventory item for the SKU.
 * 5. Customer joins and logs in.
 * 6. Customer creates a cart and adds the SKU as a cart item.
 * 7. Customer creates an order from the cart (monetary snapshot values are
 *    type-correct but synthetic).
 * 8. Seller logs in again and creates a fulfillment for one order line with a
 *    specific quantity.
 * 9. Call PATCH /shoppingMall/orders/{orderId}/fulfillments to list fulfillments
 *    with page=1, limit=10.
 * 10. Assert that pagination metadata reports at least one record, and that there
 *     is a summary entry whose order.id equals the order id and whose seller.id
 *     equals the seller id. Also verify that quantity aggregates in the summary
 *     are at least the created fulfillment's quantities.
 */
export async function test_api_order_fulfillments_listing_after_single_fulfillment_creation(
  connection: api.IConnection,
) {
  const href: string & tags.Format<"uri"> =
    "https://shopping-mall.example.com/" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://shopping-mall.example.com/ref" as string & tags.Format<"uri">;

  // 1. Platform admin joins and logs in
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = RandomGenerator.alphaNumeric(12);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminLoggedIn: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Admin creates category tree
  const categoryTreeCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
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

  // 3. Admin creates brand
  const brandCreateBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: "https://cdn.example.com/logo.png" as string & tags.Format<"uri">,
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(brand);

  // 4. Seller joins and logs in (we need seller.id for product ownership)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallSellerLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Admin creates product owned by this seller
  const platformAdminLoggedInAgain: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedInAgain);

  const productCode = RandomGenerator.alphaNumeric(12) as string &
    tags.MinLength<1>;

  const productCreateBody = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    short_description: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active" as string & tags.MinLength<1>,
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product.png" as string &
      tags.Format<"uri">,
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.platformAdmin.products.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // 6. Admin creates SKU for the product
  const skuCode = RandomGenerator.alphaNumeric(10);
  const listPrice = 10000;
  const salePrice = 9000;
  const skuCreateBody = {
    code: skuCode,
    name: RandomGenerator.name(1),
    listPrice,
    salePrice,
    currency: "KRW",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.platformAdmin.products.skus.create(
      connection,
      {
        productCode,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 7. Seller creates inventory item for the SKU
  const sellerLoggedInAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInAgain);

  const inventoryCreateBody = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventoryItem);

  // 8. Customer joins and logs in
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href,
    referrer,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 9. Customer creates cart
  const cartCreateBody = {
    currency_code: "KRW",
    region_code: "KR-SEOUL",
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
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 10. Customer adds item (SKU) to cart
  const cartItemCreateBody = {
    skuId: sku.id,
    quantity: 2,
    note: "test order line",
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

  // 11. Customer creates order from cart
  const itemsSubtotal = salePrice * cartItem.quantity;
  const discountTotal = 0;
  const shippingTotal = 3000;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const billingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: "KRW",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: shippingAddressId,
    billing_address_id: billingAddressId,
    customer_note: "e2e order",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  TestValidator.predicate(
    "order belongs to the customer",
    order.customer_id === customerAuthorized.id,
  );

  // 12. Seller logs in again and creates a fulfillment
  const sellerLoggedInForFulfillment: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedInForFulfillment);

  // In absence of explicit order line listing APIs, use a randomly generated order_line_id
  const orderLineId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const fulfillmentOrderLineCreate: IShoppingMallFulfillmentOrderLine.ICreate =
    {
      order_line_id: orderLineId,
      quantity: 1,
    };

  const fulfillmentCreateBody = {
    order_line_fulfillments: [fulfillmentOrderLineCreate],
    carrier_code: "TEST-CARRIER",
    requested_ship_date: new Date().toISOString() as string &
      tags.Format<"date-time">,
    warehouse_code: "WH-SEOUL",
    notes: "e2e single fulfillment",
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

  // 13. List fulfillments for the order
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const fulfillmentListRequest = {
    page: requestPage,
    limit: requestLimit,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallFulfillment.IRequest;

  const pageResult: IPageIShoppingMallFulfillment.ISummary =
    await api.functional.shoppingMall.orders.fulfillments.index(connection, {
      orderId: order.id,
      body: fulfillmentListRequest,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.predicate(
    "pagination records should be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1 when records exist",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  const summaries: IShoppingMallFulfillment.ISummary[] = pageResult.data;
  typia.assert(summaries);

  TestValidator.predicate(
    "at least one fulfillment summary is returned",
    summaries.length >= 1,
  );

  const matchingSummary = summaries.find((s) => s.order.id === order.id);

  TestValidator.predicate(
    "there exists a fulfillment summary for the created order",
    matchingSummary !== undefined,
  );

  if (matchingSummary !== undefined) {
    TestValidator.equals(
      "summary.order.id should equal order.id",
      matchingSummary.order.id,
      order.id,
    );

    TestValidator.equals(
      "summary.seller.id should equal seller id",
      matchingSummary.seller.id,
      sellerAuthorized.id,
    );

    TestValidator.predicate(
      "packed_quantity should be at least fulfillment.packedQuantity",
      matchingSummary.packed_quantity >= fulfillment.packedQuantity,
    );
    TestValidator.predicate(
      "shipped_quantity should be at least fulfillment.shippedQuantity",
      matchingSummary.shipped_quantity >= fulfillment.shippedQuantity,
    );
    TestValidator.predicate(
      "delivered_quantity should be at least fulfillment.deliveredQuantity",
      matchingSummary.delivered_quantity >= fulfillment.deliveredQuantity,
    );
  }
}
