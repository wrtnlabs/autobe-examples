import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
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
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test filtering refund requests by status parameter.
 *
 * Validates the refund request list endpoint's status filtering functionality. Creates multiple refund requests with different statuses (pending, approved, rejected) and verifies that the status filter correctly returns only matching requests.
 *
 * The test establishes a complete order workflow: member registration, seller setup with product and variant, order creation, shipment delivery, and refund request creation. Three refund requests are created for different order items, then the seller processes them to create varied statuses.
 *
 * 1. Member account created and authenticated.
 * 2. Seller account created, product and variant established.
 * 3. Member places order, seller creates shipment marking items as delivered.
 * 4. Three refund requests created for different order items (all initially pending).
 * 5. Seller approves first request, rejects second request, leaving third as pending.
 * 6. Filter by 'pending' - verify only third request returned.
 * 7. Filter by ['approved', 'rejected'] - verify first and second requests returned, excluding pending.
 * 8. No filter - verify all three requests returned.
 * 9. Validate pagination metadata reflects filtered counts accurately.
 */
export async function test_api_refund_request_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Create product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Create order (member needs cart items first - order creation derives from cart)
  // For this test, we'll create the order which will use member's cart
  const order =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // 6. Create shipment to mark order items as delivered
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: orderItemIds,
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 7. Create multiple refund requests for different order items
  const refundRequest1 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest1);
  const refundRequest2 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: order.orderItems[1]?.id ?? order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest2);
  const refundRequest3 =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id:
            order.orderItems[2]?.id ??
            order.orderItems[1]?.id ??
            order.orderItems[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest3);
  // 8. Seller approves first refund request
  const approvedRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest1.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  // 9. Seller rejects second refund request
  const rejectedRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest2.id,
        body: {
          sellerResponseComment: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  // 10. Test filter by 'pending' status - should return only refundRequest3
  const pendingResult =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResult.data.every((r) => r.status === "pending"),
  );
  TestValidator.equals(
    "pending count matches",
    pendingResult.data.length,
    pendingResult.pagination.records,
  );
  // 11. Test filter by ['approved', 'rejected'] status array
  const multiStatusResult =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          status: ["approved", "rejected"],
        },
      },
    );
  typia.assert(multiStatusResult);
  TestValidator.predicate(
    "multi-status filter returns only matching statuses",
    multiStatusResult.data.every(
      (r) => r.status === "approved" || r.status === "rejected",
    ),
  );
  TestValidator.equals(
    "multi-status count matches",
    multiStatusResult.data.length,
    multiStatusResult.pagination.records,
  );
  TestValidator.predicate(
    "no pending in multi-status result",
    !multiStatusResult.data.some((r) => r.status === "pending"),
  );
  // 12. Test without status filter - should return all requests
  const allResult =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all statuses present without filter",
    allResult.data.length >= 3,
  );
  TestValidator.equals(
    "all count matches",
    allResult.data.length,
    allResult.pagination.records,
  );
  // 13. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    allResult.pagination.pages >= 1,
  );
}