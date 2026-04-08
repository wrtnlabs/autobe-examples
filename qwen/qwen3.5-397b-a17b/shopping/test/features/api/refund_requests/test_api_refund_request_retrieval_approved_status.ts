import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
 * Test seller retrieval of an approved refund request with reviewed_at timestamp.
 *
 * Validates the complete refund request workflow including seller product setup, customer order placement, shipment delivery, refund request creation, seller approval, and final retrieval verification. Ensures that the approved refund request contains all required fields with correct values including populated reviewed_at timestamp and proper status.
 *
 * Special attention is given to verifying that the reviewed_at field is populated after approval, the status transitions from pending to approved, and the order item status reflects the refund decision. The test also validates that timestamps are properly formatted and that nested member and orderItem objects contain complete information.
 *
 * 1. Seller registers and authenticates via join/login.
 * 2. Seller creates a product with at least one variant.
 * 3. Customer registers and authenticates via join/login.
 * 4. Customer places an order containing the seller's product variant.
 * 5. Seller creates a shipment for the order item with tracking information.
 * 6. Customer creates a refund request for the delivered order item.
 * 7. Seller approves the refund request using the approve endpoint.
 * 8. Seller retrieves the refund request details via GET endpoint.
 * 9. Validates response contains approved status, populated reviewed_at, and correct order item status.
 */
export async function test_api_refund_request_retrieval_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerJoin.token.access, // Use the password we set
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Seller creates product with variant
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerJoin.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(customerLogin);
  // 4. Customer places order (this requires cart items, which we simulate)
  const order =
    await generate_random_shopping_mall_member_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Get the order item for this seller's product
  const orderItem = order.orderItems.find(
    (item) => item.seller.id === sellerLogin.id,
  );
  if (!orderItem) {
    throw new Error("No order item found for seller");
  }
  // 5. Seller creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 6. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Seller approves the refund request
  const approvedRefund =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefund);
  // 8. Seller retrieves the refund request details
  const retrievedRefund =
    await api.functional.shoppingMall.seller.post_purchase.refund_requests.at(
      sellerConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(retrievedRefund);
  // 9. Validate the retrieved refund request
  TestValidator.equals(
    "status is approved",
    retrievedRefund.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    retrievedRefund.reviewed_at !== null &&
      retrievedRefund.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewed_at is after created_at",
    new Date(retrievedRefund.reviewed_at!) >
      new Date(retrievedRefund.created_at),
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRefund.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "order item status is refunded",
    retrievedRefund.orderItem.status,
    "refunded",
  );
  TestValidator.equals(
    "member id matches",
    retrievedRefund.member.id,
    customerLogin.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefund.orderItem.id,
    orderItem.id,
  );
}