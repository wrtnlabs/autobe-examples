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
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create";
import { generate_random_ecommerce_mall_customer_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test retrieving refund request snapshots when seller has not yet responded.
 *
 * Validates the edge case where a customer checks refund request snapshots
 * immediately after creating the request, before the seller has had a chance
 * to respond. The snapshots endpoint should return either an empty list or
 * a list containing a snapshot with "pending" status.
 *
 * This test verifies:
 * - Customer can retrieve snapshots for their refund request
 * - Pagination metadata shows correct total records (0 or 1)
 * - When snapshots exist, snapshotStatus reflects "pending" state
 * - Data structure includes customer, seller, and reason information
 *
 * 1. Register and approve seller account.
 * 2. Seller creates product with variant and inventory.
 * 3. Customer registers and adds product to cart.
 * 4. Customer places order.
 * 5. Seller creates shipment for order item.
 * 6. Customer confirms delivery.
 * 7. Customer creates refund request.
 * 8. Customer retrieves refund request snapshots.
 * 9. Validates empty or pending snapshots with correct pagination.
 */
export async function test_api_refund_request_snapshots_empty_pending_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create and approve customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Login seller and create product with variant and inventory
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerLoginConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Get variant from product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product has no variants");
  }
  // Add inventory to variant
  await api.functional.ecommerceMall.seller.variants.inventory.create(
    sellerLoginConnection,
    {
      variantId: variant.id,
      body: {
        quantityChange: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        reason: "restock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 4. Login customer and add product to cart
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Add to cart
  const cart = await api.functional.ecommerceMall.customer.me.cart.create(
    customerLoginConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cart);
  // 5. Create order - use random shipping address ID since cart.customer ISummary doesn't have shippingAddresses
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerLoginConnection,
      {
        body: {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get order item
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order has no items");
  }
  // 6. Seller creates shipment
  const shipment =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      sellerLoginConnection,
      {
        itemId: orderItem.id,
        body: {
          carrier: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          itemIds: [orderItem.id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Customer confirms delivery
  await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
    customerLoginConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 8. Customer creates refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      customerLoginConnection,
      {
        itemId: orderItem.id,
        body: {
          reason: "Product not as described",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Customer retrieves refund request snapshots
  const snapshots =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerLoginConnection,
      {
        requestId: refundRequest.id,
        body: {} satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 10. Validate snapshots
  // Since seller has not responded yet, snapshots should be empty or contain only pending status
  TestValidator.equals(
    "pagination exists",
    snapshots.pagination !== null && snapshots.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination records is 0 or 1",
    snapshots.pagination.records === 0 || snapshots.pagination.records === 1,
    true,
  );
  // If snapshots exist, validate the first one has pending status
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    TestValidator.equals(
      "snapshot status is pending",
      firstSnapshot.snapshotStatus,
      "pending",
    );
    TestValidator.predicate(
      "customer information exists",
      firstSnapshot.customer !== null && firstSnapshot.customer !== undefined,
    );
    TestValidator.predicate(
      "seller information exists",
      firstSnapshot.seller !== null && firstSnapshot.seller !== undefined,
    );
    TestValidator.equals(
      "snapshot reason matches request",
      firstSnapshot.snapshotReason,
      "Product not as described",
    );
  }
}