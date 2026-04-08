import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequestSnapshot";
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
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequestSnapshot";
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
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test seller retrieval of refund request snapshot history for audit and dispute resolution.
 *
 * Validates the complete workflow for sellers accessing refund request snapshot history. The test establishes a full e-commerce scenario including seller and member accounts, product creation, order placement, shipment delivery, and refund request submission. The snapshot history provides an immutable audit trail of the refund request lifecycle.
 *
 * The test verifies that snapshots are created automatically when customers submit refund requests, preserving the original reason and status. Sellers can retrieve this history to understand the progression of refund requests and make informed approval decisions.
 *
 * 1. Seller registers and logs in to obtain authenticated connection.
 * 2. Member (customer) registers and logs in to obtain authenticated connection.
 * 3. Seller creates a product for the member to purchase.
 * 4. Member adds product to cart and places an order.
 * 5. Seller creates shipment to mark order as shipped and delivered.
 * 6. Member submits post-purchase refund request for delivered order item.
 * 7. Seller retrieves snapshot history for the refund request.
 * 8. Validates pagination metadata, snapshot fields, chronological ordering, and data integrity.
 */
export async function test_api_refund_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerLogin.token.access}`,
  };
  // 2. Member (customer) setup - register and login
  const memberJoin = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoin);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberLogin);
  memberConnection.headers = {
    Authorization: `Bearer ${memberLogin.token.access}`,
  };
  // 3. Seller creates product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Member adds product to cart and places order
  const variant = product.variants[0];
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // Create order with random customer address ID
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // 5. Seller creates shipment to mark order as delivered
  const orderItem = order.orderItems[0];
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
        },
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 6. Member submits post-purchase refund request
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Seller retrieves snapshot history for the refund request
  const snapshotResponse =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: "asc",
        },
      },
    );
  typia.assert(snapshotResponse);
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    () => snapshotResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    () => snapshotResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records",
    () => snapshotResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages",
    () => snapshotResponse.pagination.pages >= 1,
  );
  // Validate snapshot data exists
  TestValidator.predicate(
    "snapshots array exists",
    () => snapshotResponse.data.length >= 1,
  );
  // Validate first snapshot (initial pending snapshot)
  const firstSnapshot = snapshotResponse.data[0];
  TestValidator.equals("snapshot status", firstSnapshot.status, "pending");
  TestValidator.equals(
    "snapshot reason matches",
    firstSnapshot.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "snapshot seller_response is null",
    () => firstSnapshot.seller_response === null,
  );
  // Validate refundRequest reference in snapshot
  TestValidator.predicate(
    "refundRequest reference exists",
    () => firstSnapshot.refundRequest !== undefined,
  );
  TestValidator.equals(
    "refundRequest id matches",
    firstSnapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refundRequest status matches",
    firstSnapshot.refundRequest.status,
    refundRequest.status,
  );
  TestValidator.predicate(
    "refundRequest member exists",
    () => firstSnapshot.refundRequest.member !== undefined,
  );
  TestValidator.predicate(
    "refundRequest orderItem exists",
    () => firstSnapshot.refundRequest.orderItem !== undefined,
  );
  // Validate chronological ordering (if multiple snapshots exist)
  if (snapshotResponse.data.length > 1) {
    for (let i = 1; i < snapshotResponse.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is after snapshot ${i - 1}`,
        () =>
          new Date(snapshotResponse.data[i].created_at) >=
          new Date(snapshotResponse.data[i - 1].created_at),
      );
    }
  }
  // Validate data isolation - seller can access their own refund request snapshots
  TestValidator.predicate(
    "seller can access own refund request snapshots",
    () => {
      const snapshotOrderItem = firstSnapshot.refundRequest.orderItem;
      return snapshotOrderItem.seller.id === sellerJoin.id;
    },
  );
}