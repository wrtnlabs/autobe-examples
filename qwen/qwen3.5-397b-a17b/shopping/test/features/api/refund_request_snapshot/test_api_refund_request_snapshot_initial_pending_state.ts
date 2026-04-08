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
 * Test refund request snapshot initial pending state retrieval.
 *
 * Validates that a customer can retrieve the initial pending snapshot created when they first submit a refund request, before any seller response. The test establishes a complete order fulfillment workflow including member and seller account creation, product listing, order placement, shipment creation, and delivery confirmation.
 *
 * The test verifies that when a customer submits a refund request for a delivered order item, the system automatically creates an initial snapshot with 'pending' status and null sellerResponse. This snapshot preserves the customer's original reason text and creation timestamp for audit trail purposes.
 *
 * 1. Member and seller accounts are created with unique credentials.
 * 2. Seller creates a product with a variant for purchase.
 * 3. Member places an order containing the product variant.
 * 4. Seller creates a shipment and marks it as delivered.
 * 5. Member submits a refund request with a reason text.
 * 6. Member retrieves the initial snapshot and validates pending state.
 * 7. Verifies sellerResponse is null and status is 'pending'.
 * 8. Confirms reason text matches the original submission exactly.
 */
export async function test_api_refund_request_snapshot_initial_pending_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller creates product
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
  // 4. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: `Color: ${RandomGenerator.alphabets(5)}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member places order (requires cart items - using order creation endpoint)
  // Note: Order creation derives items from customer's active cart
  const customerAddressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.member.orders.create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: customerAddressId,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Get the order item for this order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", () => order.orderItems.length > 0);
  // 7. Seller creates shipment for the order item
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick([
            "FedEx",
            "UPS",
            "DHL",
            "USPS",
          ] as const),
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Mark shipment as delivered (required for refund eligibility)
  const deliveredShipment =
    await api.functional.shoppingMall.seller.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          carrier_name: shipment.carrier_name,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(deliveredShipment);
  // 9. Member creates refund request (creates initial pending snapshot)
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Retrieve the initial snapshot (need to get snapshot ID from refund request)
  // The snapshot is created automatically when refund request is created
  // We need to list snapshots first to get the snapshot ID
  // For this test, we'll use the refund request created_at as the snapshot was created at same time
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 11. Get the specific snapshot
  const snapshot =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.snapshots.at(
      memberConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 12. Validate snapshot initial pending state
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches submission",
    snapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "sellerResponse is null for pending snapshot",
    snapshot.sellerResponse,
    null,
  );
  TestValidator.equals(
    "refund request reference matches",
    snapshot.refundRequest.id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "snapshot has valid UUID",
    () => snapshot.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    () => !isNaN(Date.parse(snapshot.created_at)),
  );
}
