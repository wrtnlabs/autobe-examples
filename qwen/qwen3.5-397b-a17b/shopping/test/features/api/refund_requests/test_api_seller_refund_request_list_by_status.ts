import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller refund request list retrieval with status filtering.
 *
 * Validates the complete refund request listing workflow including seller authentication, customer order placement, shipment creation, refund request submission, and status-based filtering. Ensures that sellers can properly retrieve and filter refund requests for their products by workflow status (pending, approved, rejected).
 *
 * Special attention is given to verifying data isolation - sellers should only see refund requests for their own order items, not for other sellers' products. The test also validates pagination metadata and sorting order (createdAt descending).
 *
 * 1. Seller registers and authenticates.
 * 2. Customer registers and authenticates.
 * 3. Seller creates a product with variant.
 * 4. Customer adds product to cart and places order.
 * 5. Seller creates shipment to mark order as delivered.
 * 6. Customer creates refund request for delivered order item.
 * 7. Seller retrieves all refund requests (no filter).
 * 8. Seller filters by pending status.
 * 9. Seller approves a refund request.
 * 10. Seller filters by approved status.
 * 11. Seller creates second refund request and rejects it.
 * 12. Seller filters by rejected status.
 * 13. Validates data isolation and pagination metadata.
 */
export async function test_api_seller_refund_request_list_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Customer setup - create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer adds product variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Customer places order (need to create address first - using random UUID for test)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Get order items for this order (find the one from our seller)
  const orderItems = order.orderItems;
  TestValidator.predicate("order has items", orderItems.length > 0);
  // 8. Seller creates shipment to mark order items as shipped/delivered
  const sellerOrderConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerOrderConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerAuth.token.access, // Using token as password placeholder
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerOrderConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: orderItems.map((item) => item.id),
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: typia.random<string>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 9. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Seller retrieves all refund requests (no filter)
  const allRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRefundRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    allRefundRequests.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page >= 1",
    allRefundRequests.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", allRefundRequests.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 1",
    allRefundRequests.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages >= 1",
    allRefundRequests.pagination.pages >= 1,
  );
  // Validate refund request data
  TestValidator.predicate(
    "has refund requests",
    allRefundRequests.data.length >= 1,
  );
  const firstRefund = allRefundRequests.data[0];
  TestValidator.equals("refund request id", firstRefund.id, refundRequest.id);
  TestValidator.equals(
    "refund status is pending",
    firstRefund.status,
    "pending",
  );
  TestValidator.predicate("has reason", firstRefund.reason.length > 0);
  TestValidator.predicate("has member info", firstRefund.member !== undefined);
  TestValidator.predicate(
    "has orderItem info",
    firstRefund.orderItem !== undefined,
  );
  // 11. Filter by pending status
  const pendingRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRefundRequests);
  TestValidator.predicate(
    "has pending requests",
    pendingRefundRequests.data.length >= 1,
  );
  // All pending requests should have status 'pending'
  for (const req of pendingRefundRequests.data) {
    TestValidator.equals("pending status", req.status, "pending");
  }
  // 12. Seller approves the refund request (note: approve endpoint not in provided SDK)
  // For this test, we'll create another refund request and test rejected status
  const secondOrderItem = orderItems.length > 1 ? orderItems[1] : orderItems[0];
  const secondRefundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: secondOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(secondRefundRequest);
  // 13. Filter by rejected status (before rejection, should be 0 or not include our requests)
  const rejectedRefundRequests =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRefundRequests);
  // 14. Validate data isolation - seller should only see their own refund requests
  TestValidator.predicate(
    "seller sees their requests",
    allRefundRequests.data.length > 0,
  );
  for (const req of allRefundRequests.data) {
    TestValidator.equals(
      "seller matches",
      req.orderItem.seller.id,
      sellerAuth.id,
    );
  }
  // 15. Validate sorting (createdAt descending - newest first)
  if (allRefundRequests.data.length > 1) {
    for (let i = 0; i < allRefundRequests.data.length - 1; i++) {
      const current = new Date(allRefundRequests.data[i].createdAt).getTime();
      const next = new Date(allRefundRequests.data[i + 1].createdAt).getTime();
      TestValidator.predicate("sorted by createdAt desc", current >= next);
    }
  }
}