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
 * Test member's own refund request list retrieval with data isolation.
 *
 * Validates that members can only view their own post-purchase refund requests through the list endpoint. The test creates multiple actors (member and seller), establishes a complete order flow with delivered items, and creates refund requests to verify proper data isolation and pagination.
 *
 * The test scenario includes creating a member account, an approved seller account, a product with variants, an order with shipped and delivered items, and multiple refund requests. It then verifies that the list endpoint returns only the refund requests belonging to the authenticated member.
 *
 * 1. Member account creation via authorize_member_join.
 * 2. Seller account creation and approval via authorize_seller_join.
 * 3. Product creation with variants by seller.
 * 4. Order creation by member with cart items.
 * 5. Shipment creation by seller with delivered_at timestamp.
 * 6. Multiple refund requests created by member for delivered order items.
 * 7. Refund request list retrieval and validation.
 * 8. Edge case: Empty result set for member with no refund requests.
 */
export async function test_api_refund_request_list_member_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product with variants
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Create order by member
  const order = await api.functional.shoppingMall.member.orders.create(
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
  // 5. Create shipment and mark as delivered
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: order.orderItems.map((item) => item.id),
          carrier_name: "FedEx",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 6. Create multiple refund requests for delivered order items
  const refundRequests: IShoppingMallRefundRequest[] = [];
  for (const orderItem of order.orderItems) {
    const refundRequest =
      await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
        memberConnection,
        {
          body: {
            order_item_id: orderItem.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallRefundRequest.ICreate,
        },
      );
    typia.assert(refundRequest);
    refundRequests.push(refundRequest);
  }
  // 7. Retrieve refund request list and validate
  const refundRequestList =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestList);
  // Validate pagination
  TestValidator.equals("current page", refundRequestList.pagination.current, 1);
  TestValidator.predicate(
    "total records matches refund requests",
    refundRequestList.pagination.records >= refundRequests.length,
  );
  TestValidator.predicate(
    "pages count is correct",
    refundRequestList.pagination.pages >= 1,
  );
  // Validate data isolation - only member's own requests
  for (const refundRequest of refundRequestList.data) {
    TestValidator.equals(
      "member id matches",
      refundRequest.member.id,
      memberAuth.id,
    );
    TestValidator.predicate(
      "has valid reason",
      refundRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "status is valid",
      ["pending", "approved", "rejected"].includes(refundRequest.status),
    );
    TestValidator.predicate(
      "order item exists",
      refundRequest.orderItem !== undefined,
    );
  }
  // 8. Edge case: Test empty result set with new member
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMemberAuth = await authorize_member_join(newMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newMemberAuth);
  const emptyRefundRequestList =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.index(
      newMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallPostPurchaseRefundRequest.IRequest,
      },
    );
  typia.assert(emptyRefundRequestList);
  TestValidator.equals(
    "empty data array",
    emptyRefundRequestList.data.length,
    0,
  );
  TestValidator.equals(
    "zero total records",
    emptyRefundRequestList.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages",
    emptyRefundRequestList.pagination.pages,
    0,
  );
}
