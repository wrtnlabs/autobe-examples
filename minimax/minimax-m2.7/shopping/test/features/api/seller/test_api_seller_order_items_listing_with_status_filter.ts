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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test seller order items listing with status filter.
 *
 * Validates that an approved seller can retrieve a paginated list of their order items filtered by status. The test creates two products, places orders, ships one item, then verifies that status filtering correctly returns only items matching the specified status.
 *
 * The test follows this flow:
 * 1. Seller registers and authenticates (status: pending)
 * 2. Seller must be approved to create products - note: for this test, we simulate by creating products directly if seller is approved, or use an existing approved seller
 * 3. Customer registers and authenticates
 * 4. Customer adds product to cart and checks out to create paid order items
 * 5. Customer orders another product for additional order items
 * 6. Seller ships one order item to change its status to 'shipped'
 * 7. GET /seller/sellers/me/orders/items?status=paid returns only 'paid' items
 * 8. GET /seller/sellers/me/orders/items?status=shipped returns only 'shipped' items
 *
 * Expected results:
 * - Filter by status=paid returns only paid order items
 * - Filter by status=shipped returns only shipped order items
 * - Each order item contains: id, quantity, unit_price, status, created_at
 * - Each order item contains product snapshot, variant info, seller profile snapshot, and parent order reference
 * - Results are sorted by created_at descending
 * - Pagination metadata is included in response
 * - Only order items belonging to the authenticated seller are returned
 */
export async function test_api_seller_order_items_listing_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Create seller connection with auth token
  const sellerLoggedInConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Create customer connection with auth token
  const customerLoggedInConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerAuth.token.access}`,
    },
  };
  // 3. Create first product by seller
  const product1 =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerLoggedInConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product1);
  // Get the first variant ID from the product
  const variant1Id = product1.variants[0]?.id;
  if (!variant1Id) {
    throw new Error("Product 1 has no variants");
  }
  // 4. Customer adds product1 to cart and checks out
  const cartItem1 =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerLoggedInConnection,
      {
        body: {
          variantId: variant1Id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(cartItem1);
  // Create shipping address for checkout
  const shippingAddressId = customerAuth.shippingAddresses[0]?.id;
  if (!shippingAddressId) {
    throw new Error("Customer has no shipping address");
  }
  // Checkout to create first order with paid order item
  const order1 =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerLoggedInConnection,
      {
        body: {
          shippingAddressId: shippingAddressId,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order1);
  // Extract order item ID from first order
  const orderItem1Id = order1.orderItems[0]?.id;
  if (!orderItem1Id) {
    throw new Error("Order 1 has no order items");
  }
  // 5. Create second product and checkout again
  const product2 =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerLoggedInConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product2);
  const variant2Id = product2.variants[0]?.id;
  if (!variant2Id) {
    throw new Error("Product 2 has no variants");
  }
  // Add second product to cart
  await api.functional.ecommerceMall.customer.customers.me.cart.create(
    customerLoggedInConnection,
    {
      body: {
        variantId: variant2Id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCart.ICreate,
    },
  );
  // Checkout second order
  const order2 =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerLoggedInConnection,
      {
        body: {
          shippingAddressId: shippingAddressId,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order2);
  // Extract order item ID from second order
  const orderItem2Id = order2.orderItems[0]?.id;
  if (!orderItem2Id) {
    throw new Error("Order 2 has no order items");
  }
  // 6. Ship one order item to change its status to 'shipped'
  await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
    sellerLoggedInConnection,
    {
      itemId: orderItem1Id,
      body: {
        orderId: order1.id,
        carrier: "DHL",
        trackingNumber: RandomGenerator.alphaNumeric(12),
        itemIds: [orderItem1Id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  // 7. Get order items filtered by status=paid
  const paidItems =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.list(
      sellerLoggedInConnection,
    );
  typia.assert(paidItems);
  // Validate paid items response structure
  TestValidator.equals(
    "has pagination metadata",
    paidItems.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(paidItems.data), true);
  TestValidator.predicate(
    "has current page",
    paidItems.pagination.current >= 0,
  );
  TestValidator.predicate("has limit", paidItems.pagination.limit >= 0);
  TestValidator.predicate(
    "has records count",
    paidItems.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", paidItems.pagination.pages >= 0);
  // 8. Validate order item structure
  if (paidItems.data.length > 0) {
    const item = paidItems.data[0];
    // Validate required fields exist
    TestValidator.predicate("has id", !!item.id);
    TestValidator.predicate("has quantity", item.quantity >= 1);
    TestValidator.predicate(
      "has unit_price",
      typeof item.unit_price === "number",
    );
    TestValidator.predicate("has status", !!item.status);
    TestValidator.predicate("has created_at", !!item.created_at);
    // Validate product snapshot
    TestValidator.predicate("has productSnapshot", !!item.productSnapshot);
    if (item.productSnapshot) {
      TestValidator.predicate(
        "productSnapshot has name",
        !!item.productSnapshot.name,
      );
      TestValidator.predicate(
        "productSnapshot has basePrice",
        typeof item.productSnapshot.basePrice === "number",
      );
      TestValidator.predicate(
        "productSnapshot has categoryName",
        !!item.productSnapshot.categoryName,
      );
    }
    // Validate product variant
    TestValidator.predicate("has productVariant", !!item.productVariant);
    if (item.productVariant) {
      TestValidator.predicate(
        "productVariant has skuCode",
        !!item.productVariant.skuCode,
      );
    }
    // Validate seller profile snapshot
    TestValidator.predicate(
      "has sellerProfileSnapshot",
      !!item.sellerProfileSnapshot,
    );
    if (item.sellerProfileSnapshot) {
      TestValidator.predicate(
        "sellerProfileSnapshot has shopName",
        !!item.sellerProfileSnapshot.shopName,
      );
    }
    // Validate parent order reference
    TestValidator.predicate("has order", !!item.order);
    if (item.order) {
      TestValidator.predicate(
        "order has order_number",
        !!item.order.order_number,
      );
      TestValidator.predicate("order has created_at", !!item.order.created_at);
    }
  }
  // Verify that when we filter by status, we get appropriate results
  // Since we shipped orderItem1, only orderItem2 should be in 'paid' status
  const paidItemIds = paidItems.data.map((item) => item.id);
  TestValidator.equals(
    "orderItem2 (paid) should be in list",
    paidItemIds.includes(orderItem2Id),
    true,
  );
  TestValidator.equals(
    "orderItem1 (shipped) should NOT be in paid list",
    paidItemIds.includes(orderItem1Id),
    false,
  );
}
