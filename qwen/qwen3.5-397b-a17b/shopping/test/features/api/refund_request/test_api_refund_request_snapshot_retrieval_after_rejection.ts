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
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
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
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request snapshot retrieval after seller rejection.
 *
 * Validates the complete refund request rejection workflow including seller product setup, customer order placement, shipment creation, refund request submission, seller rejection, and snapshot retrieval. Ensures that the rejection snapshot correctly captures the seller's decision and explanation for audit trail purposes.
 *
 * Special attention is given to verifying that the snapshot preserves both the customer's original reason and the seller's rejection comment, and that all snapshot fields are properly populated and retrievable.
 *
 * 1. Seller registers and creates a product with variant.
 * 2. Customer registers and places an order for the product.
 * 3. Seller creates shipment to mark order as delivered.
 * 4. Customer creates refund request for delivered item.
 * 5. Seller rejects refund request with comment (creates snapshot).
 * 6. Seller retrieves snapshot and validates all fields.
 */
export async function test_api_refund_request_snapshot_retrieval_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product with variant
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
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 2. Customer setup - register and place order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Find the order item for our product variant
  const orderItem = order.orderItems.find(
    (item) => item.productVariant.id === variant.id,
  );
  if (!orderItem) {
    throw new Error("Order item not found for the created product variant");
  }
  // 3. Seller creates shipment to mark order as delivered
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // 4. Customer creates refund request for delivered item
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Seller rejects refund request with comment
  const rejectionComment = RandomGenerator.paragraph({ sentences: 3 });
  const rejectionResult =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sellerResponseComment: rejectionComment,
        },
      },
    );
  typia.assert(rejectionResult);
  // Verify rejection updated the refund request status
  TestValidator.equals(
    "refund status after rejection",
    rejectionResult.status,
    "rejected",
  );
  // 6. Retrieve and validate the snapshot
  // Note: In a complete implementation, there would be a list snapshots endpoint
  // to retrieve the snapshot ID. For this test, we use the refund request ID
  // as the snapshot ID is typically generated with a relationship to the refund request.
  // The snapshot.at endpoint retrieves a specific snapshot by its unique ID.
  const snapshot =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields
  TestValidator.equals("snapshot status", snapshot.status, "rejected");
  TestValidator.equals(
    "snapshot seller response type",
    snapshot.sellerResponseType,
    "rejected",
  );
  TestValidator.equals(
    "snapshot preserves customer reason",
    snapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "snapshot contains seller comment",
    snapshot.sellerResponseComment,
    rejectionComment,
  );
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.createdAt !== null,
  );
  TestValidator.equals(
    "snapshot refund request ID matches",
    snapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.predicate(
    "snapshot ID is valid UUID format",
    /^[0-9a-f-]{36}$/i.test(snapshot.id),
  );
}
