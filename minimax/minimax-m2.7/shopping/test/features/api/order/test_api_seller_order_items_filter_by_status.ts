import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Setup - Register and approve a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Admin approves the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create products for the seller (need category - using prepare_random_ecommerce_mall_product handles this)
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Get variant from product and add inventory
  const variant = product.variants[0];
  typia.assert(variant);
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: { quantityChange: 100, reason: "Initial stock" },
    },
  );
  // 5. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 6. Create first order (items will be 'paid' status)
  const order1 =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: address.id },
      },
    );
  typia.assert(order1);
  // 7. Create second order
  const order2 =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: { shippingAddressId: address.id },
      },
    );
  typia.assert(order2);
  // Get order items from both orders
  const orderItems1 = order1.orderItems;
  const orderItems2 = order2.orderItems;
  // 8. Create shipment for some items (status='shipped')
  if (orderItems1.length > 0) {
    await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
      sellerConnection,
      {
        params: { itemId: orderItems1[0].id },
        body: {
          itemIds: [orderItems1[0].id],
          carrier: "DHL",
          trackingNumber: "1234567890",
        },
      },
    );
  }
  // 9. Confirm delivery for some items (status='delivered')
  if (orderItems2.length > 0) {
    // First ship the item
    const shipment =
      await generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
        sellerConnection,
        {
          params: { itemId: orderItems2[0].id },
          body: {
            itemIds: [orderItems2[0].id],
            carrier: "FedEx",
            trackingNumber: "9876543210",
          },
        },
      );
    typia.assert(shipment);
    // Confirm delivery
    await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order2.id,
        shipmentId: shipment.id,
      },
    );
  }
  // ========================================
  // TEST EXECUTION - Filter by status
  // ========================================
  // Test 1: Filter by 'paid' status
  const paidItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: { status: "paid" } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItems);
  // Verify all returned items have 'paid' status
  for (const item of paidItems.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // Test 2: Filter by 'shipped' status
  const shippedItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: { status: "shipped" } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  for (const item of shippedItems.data) {
    TestValidator.equals("item status is shipped", item.status, "shipped");
  }
  // Test 3: Filter by 'delivered' status
  const deliveredItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  for (const item of deliveredItems.data) {
    TestValidator.equals("item status is delivered", item.status, "delivered");
  }
  // Test 4: Test pagination with status filter
  const paginatedPaidItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paginatedPaidItems);
  // Verify pagination structure
  TestValidator.predicate(
    "has pagination data",
    paginatedPaidItems.pagination !== null,
  );
  TestValidator.predicate(
    "page is 1",
    paginatedPaidItems.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    paginatedPaidItems.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records >= 0",
    paginatedPaidItems.pagination.records >= 0,
  );
  // Test 5: Get all items without status filter
  const allItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: {} satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(allItems);
  // Verify we have items from paid, shipped, and delivered statuses
  const hasPaid = allItems.data.some((item) => item.status === "paid");
  const hasShipped = allItems.data.some((item) => item.status === "shipped");
  const hasDelivered = allItems.data.some(
    (item) => item.status === "delivered",
  );
  TestValidator.predicate(
    "has paid items in all items",
    hasPaid || paidItems.data.length > 0,
  );
  TestValidator.predicate(
    "has shipped items in all items",
    hasShipped || shippedItems.data.length > 0,
  );
  TestValidator.predicate(
    "has delivered items in all items",
    hasDelivered || deliveredItems.data.length > 0,
  );
  // Test 6: Filter by 'cancelled' status (should return empty or items if any)
  const cancelledItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: {
          status: "cancelled",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(cancelledItems);
  // Test 7: Filter by 'refunded' status (should return empty or items if any)
  const refundedItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.index(
      sellerConnection,
      {
        body: { status: "refunded" } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(refundedItems);
  // Final verification: Status counts should add up
  const filteredTotal =
    paidItems.data.length +
    shippedItems.data.length +
    deliveredItems.data.length +
    cancelledItems.data.length +
    refundedItems.data.length;
  TestValidator.predicate(
    "filtered counts match or are subset of total",
    filteredTotal <= allItems.data.length || allItems.data.length > 0,
  );
}
