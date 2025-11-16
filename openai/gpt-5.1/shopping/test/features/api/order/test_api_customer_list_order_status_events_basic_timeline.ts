import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusEvent";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillment";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallFulfillmentOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentOrderLine";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallOrderReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequest";
import type { IShoppingMallOrderReturnRequestAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestAttachment";
import type { IShoppingMallOrderReturnRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturnRequestItem";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallOrderStatusEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusEvent";
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
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSummary";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate that a customer can retrieve the basic status event timeline for an
 * order.
 *
 * Business context:
 *
 * - A customer signs up and creates a cart.
 * - A seller and platform admin set up the minimal catalog (category tree, brand,
 *   product, SKU, inventory).
 * - The customer adds the SKU to their cart and creates an order from that cart.
 * - The system is expected to record at least an initial status event for the
 *   order in the shopping_mall_order_status_events table.
 * - The customer then queries PATCH
 *   /shoppingMall/customer/orders/{orderId}/statusEvents to retrieve a
 *   paginated timeline of status events.
 *
 * Test steps:
 *
 * 1. Register and log in a customer.
 * 2. Register and log in a seller.
 * 3. Register and log in a platform admin.
 * 4. As platform admin, create a category tree and a brand.
 * 5. As seller, create a product bound to the seller and brand, plus a SKU and
 *    inventory item to make the SKU purchasable.
 * 6. As customer, create a customer cart and add one item referencing the SKU.
 * 7. As customer, create an order from the cart with consistent monetary snapshot
 *    fields.
 * 8. Optionally, enrich lifecycle
 *    (cancellation/return/dispute/fulfillment/shipment/tracking) to increase
 *    status event count (not strictly asserted).
 * 9. As customer, call statusEvents.index with page=1 and limit=20 and no
 *    additional filters.
 * 10. Assert the response structure with typia.assert.
 * 11. Assert business rules:
 *
 *     - Events belong to the created order.
 *     - At least one event exists (if not, predicate will fail and surface issue).
 *     - Events are ordered newest-first by occurred_at.
 */
export async function test_api_customer_list_order_status_events_basic_timeline(
  connection: api.IConnection,
) {
  // Helper to clone a connection for a different actor without touching headers directly
  const cloneConnection = (): api.IConnection => ({
    ...connection,
    headers: { ...(connection.headers ?? {}) },
  });

  // 1. Register customer
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinRequest = {
    email: customerEmail,
    password: "customer-password",
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerConnection: api.IConnection = cloneConnection();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerConnection, {
      body: customerJoinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Register seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinRequest = {
    email: sellerEmail,
    password: "seller-password",
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const sellerConnection: api.IConnection = cloneConnection();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerConnection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 3. Register platform admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinRequest = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "admin-password",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminConnection: api.IConnection = cloneConnection();
  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(adminConnection, {
      body: platformAdminJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdminAuthorized);

  // 4. As platform admin, create category tree and brand
  const categoryTreeRequest = {
    code: RandomGenerator.alphaNumeric(12),
    name: "Main Catalog Tree",
    description: "Primary tree for e2e tests",
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;
  const categoryTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      adminConnection,
      {
        body: categoryTreeRequest,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(categoryTree);

  const brandRequest = {
    name: "E2E Test Brand",
    slug: RandomGenerator.alphaNumeric(10),
    description: "Brand for order status event timeline test",
    logo_uri: "https://cdn.example.com/brand-logo.png",
  } satisfies IShoppingMallBrand.ICreate;
  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(
      adminConnection,
      {
        body: brandRequest,
      },
    );
  typia.assert<IShoppingMallBrand>(brand);

  // 5. As seller, create product, SKU, and inventory
  const productCode = RandomGenerator.alphaNumeric(16);
  const productCreate = {
    shopping_mall_seller_id: sellerAuthorized.id,
    shopping_mall_brand_id: brand.id,
    code: productCode,
    name: "E2E Order Status Product",
    short_description: "Product used for order status event timeline test",
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    is_multi_sku: true,
    primary_image_uri: "https://cdn.example.com/product-image.png",
    additional_data: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: productCreate,
    });
  typia.assert<IShoppingMallProduct>(product);

  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuCreate = {
    code: skuCode,
    name: "Default Variant",
    listPrice: 100,
    salePrice: 80,
    currency: "USD",
    isActive: true,
    isPurchasable: true,
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(
      sellerConnection,
      {
        productCode,
        body: skuCreate,
      },
    );
  typia.assert<IShoppingMallProductSku>(sku);

  const inventoryCreate = {
    product_sku_id: sku.id,
    on_hand_quantity: 100,
    low_stock_threshold: 5,
    backorder_enabled: false,
    preorder_enabled: false,
  } satisfies IShoppingMallInventoryItem.ICreate;

  const inventoryItem: IShoppingMallInventoryItem =
    await api.functional.shoppingMall.seller.inventoryItems.create(
      sellerConnection,
      {
        body: inventoryCreate,
      },
    );
  typia.assert<IShoppingMallInventoryItem>(inventoryItem);

  // 6. As customer, create cart and add item
  const cartCreate = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: undefined,
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      customerConnection,
      {
        body: cartCreate,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  const cartItemCreate = {
    skuId: sku.id,
    quantity: 1,
    note: "E2E order status event test item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      customerConnection,
      {
        customerCartId: cart.id,
        body: cartItemCreate,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 7. As customer, create order from cart
  const itemsSubtotal = 80;
  const discountTotal = 0;
  const shippingTotal = 0;
  const taxTotal = 0;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreate = {
    customer_cart_id: cart.id,
    currency_code: "USD",
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver quickly.",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      {
        body: orderCreate,
      },
    );
  typia.assert<IShoppingMallOrder>(order);

  // 8. Optionally enrich lifecycle (single cancellation request as an example)
  const cancellationCreate = {
    request_reason_category: "customer_change_mind",
    request_reason_detail: "Test cancellation to emit status event",
  } satisfies IShoppingMallOrderCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallOrderCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      customerConnection,
      {
        orderId: order.id,
        body: cancellationCreate,
      },
    );
  typia.assert<IShoppingMallOrderCancellationRequest>(cancellationRequest);

  // 9. Call statusEvents.index as the customer
  const statusRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status_codes: undefined,
    originator_types: undefined,
    from_timestamp: null,
    to_timestamp: null,
    sort_direction: undefined,
  } satisfies IShoppingMallOrderStatusEvent.IRequest;

  const page: IPageIShoppingMallOrderStatusEvent.ISummary =
    await api.functional.shoppingMall.customer.orders.statusEvents.index(
      customerConnection,
      {
        orderId: order.id,
        body: statusRequest,
      },
    );
  typia.assert<IPageIShoppingMallOrderStatusEvent.ISummary>(page);

  // 10. Business assertions
  // Pagination: first page should be index 0 in zero-based system
  TestValidator.equals(
    "pagination current page should be 0 for first page",
    page.pagination.current,
    0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    page.pagination.limit > 0,
  );

  // Ensure all events belong to the created order and collect occurred_at values
  const occurredAtList: (string & tags.Format<"date-time">)[] = [];
  for (const event of page.data) {
    typia.assert<IShoppingMallOrderStatusEvent.ISummary>(event);
    TestValidator.equals(
      "each event must belong to the created order",
      event.order.id,
      order.id,
    );
    occurredAtList.push(event.occurred_at);
  }

  // There should be at least one event for the order lifecycle
  TestValidator.predicate(
    "status event timeline should contain at least one event",
    page.data.length >= 1,
  );

  // Verify events are ordered newest-first by occurred_at (non-increasing)
  for (let i = 1; i < occurredAtList.length; ++i) {
    const prev = new Date(occurredAtList[i - 1]).getTime();
    const curr = new Date(occurredAtList[i]).getTime();
    TestValidator.predicate(
      "status events should be ordered by occurred_at descending",
      prev >= curr,
    );
  }
}
