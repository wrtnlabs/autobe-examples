import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that authenticated customers can retrieve and filter refund request snapshots.
 *
 * Validates the complete refund request snapshot listing workflow including customer and seller authentication, product creation, order placement, delivery confirmation, and refund request lifecycle (approve and reject). Tests the paginated snapshot listing endpoint with various filter combinations to verify correct data retrieval and filtering behavior.
 *
 * The test creates two refund request scenarios: one approved by the seller and one rejected. Each status transition creates an immutable snapshot that can be retrieved and filtered by the customer.
 *
 * 1. Register and authenticate customer and seller accounts
 * 2. Seller creates a product with variants and initial inventory
 * 3. Customer adds product to cart and completes checkout
 * 4. Seller ships the order items
 * 5. Customer confirms delivery
 * 6. Customer creates first refund request for delivered item
 * 7. Seller approves first refund request (creates snapshot: pending → approved)
 * 8. Customer creates second refund request for another delivered item
 * 9. Seller rejects second refund request (creates snapshot: pending → rejected)
 * 10. Customer retrieves all snapshots without filters
 * 11. Customer filters snapshots by status_after='approved'
 * 12. Customer filters snapshots by status_after='rejected'
 * 13. Customer filters snapshots by specific refund_request_id
 * 14. Customer filters snapshots by created_at date range
 */
export async function test_api_refund_request_snapshots_list_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant with initial stock
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: typia.random<string & tags.Format<"uuid">>(),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds product to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Customer places order (checkout)
  const order = await api.functional.shoppingMall.customer.checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: typia.random<string>(),
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 7. Seller ships the order
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          carrier_name: "Test Carrier",
          tracking_number: typia.random<string>(),
          order_item_ids: order.items.map((item) => item.id),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 9. Customer creates first refund request
  const firstRefundRequest =
    await api.functional.shoppingMall.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          reason: "Product quality issue - first request",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(firstRefundRequest);
  // 10. Seller approves first refund request (creates snapshot: pending → approved)
  const approvedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.approve(
      sellerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          responseText: "Approved due to quality concern",
        } satisfies IShoppingMallRefundRequest.IApprove,
      },
    );
  typia.assert(approvedRefund);
  // 11. Customer creates second refund request (using another item or same item if available)
  // Note: In real scenario, we'd need another order item. Using the same item for test purposes.
  const secondRefundRequest =
    await api.functional.shoppingMall.customer.orders.items.refund.create(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        body: {
          reason: "Wrong item received - second request",
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(secondRefundRequest);
  // 12. Seller rejects second refund request (creates snapshot: pending → rejected)
  const rejectedRefund =
    await api.functional.shoppingMall.seller.orders.items.refund.reject(
      sellerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
      },
    );
  typia.assert(rejectedRefund);
  // 13. Customer retrieves all snapshots without filters
  const allSnapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 14. Verify pagination metadata
  TestValidator.predicate(
    "has valid pagination",
    allSnapshots.pagination.current >= 1 &&
      allSnapshots.pagination.limit >= 1 &&
      allSnapshots.pagination.records >= 0 &&
      allSnapshots.pagination.pages >= 0,
  );
  // 15. Verify snapshots contain expected data
  TestValidator.predicate(
    "has at least 2 snapshots",
    allSnapshots.data.length >= 2,
  );
  // 16. Verify each snapshot has required fields
  for (const snapshot of allSnapshots.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} has refund_request_id`,
      snapshot.refund_request_id !== undefined,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has seller info`,
      snapshot.seller !== undefined,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has status_before`,
      snapshot.status_before !== undefined,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has status_after`,
      snapshot.status_after !== undefined,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} has created_at`,
      snapshot.created_at !== undefined,
    );
  }
  // 17. Filter by status_after='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          status_after: "approved",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.predicate(
    "approved filter returns only approved snapshots",
    approvedSnapshots.data.every((s) => s.status_after === "approved"),
  );
  // 18. Filter by status_after='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          status_after: "rejected",
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.predicate(
    "rejected filter returns only rejected snapshots",
    rejectedSnapshots.data.every((s) => s.status_after === "rejected"),
  );
  // 19. Filter by specific refund_request_id
  const byRequestIdSnapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          refund_request_id: firstRefundRequest.id,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(byRequestIdSnapshots);
  TestValidator.predicate(
    "refund_request_id filter returns matching snapshots",
    byRequestIdSnapshots.data.every(
      (s) => s.refund_request_id === firstRefundRequest.id,
    ),
  );
  // 20. Filter by created_at range
  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const toDate = new Date().toISOString();
  const byDateRangeSnapshots =
    await api.functional.shoppingMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(byDateRangeSnapshots);
  TestValidator.predicate(
    "date range filter returns snapshots within range",
    byDateRangeSnapshots.data.every(
      (s) =>
        new Date(s.created_at) >= new Date(fromDate) &&
        new Date(s.created_at) <= new Date(toDate),
    ),
  );
  // 21. Verify snapshots are sorted by created_at descending (newest first)
  if (allSnapshots.data.length > 1) {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than snapshot ${i - 1}`,
        new Date(allSnapshots.data[i].created_at) <=
          new Date(allSnapshots.data[i - 1].created_at),
      );
    }
  }
}
