import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
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
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a customer can successfully retrieve their own post-purchase cancellation request.
 *
 * Validates the complete workflow from member registration through cancellation request creation and retrieval. Ensures that customers can access their own cancellation requests with all related entity data properly nested including member, order item, seller, and snapshot information.
 *
 * The test verifies that the cancellation request contains accurate data including the customer's reason, pending status, and automatically generated initial snapshot. All entity relationships are validated to ensure proper data integrity throughout the cancellation request lifecycle.
 *
 * 1. Member registers and authenticates via join.
 * 2. Seller registers and authenticates via join, creates product with variant.
 * 3. Member adds variant to cart and places order creating order items with 'paid' status.
 * 4. Member creates post-purchase cancellation request with reason for the order item.
 * 5. Customer retrieves their cancellation request by ID and validates all fields.
 * 6. Verifies snapshot array contains initial state with status 'pending' and customer's reason.
 */
export async function test_api_post_purchase_cancellation_request_retrieve_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  // 2. Seller registration and authentication
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
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member adds variant to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Member places order (creates order with 'paid' status items)
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
  // Get the first order item (should have 'paid' status)
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 7. Member creates post-purchase cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 8. Retrieve cancellation request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.at(
      memberConnection,
      {
        id: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 9. Validate cancellation request data
  TestValidator.equals(
    "id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "member matches",
    retrievedRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "order item matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "seller matches",
    retrievedRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    cancellationReason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller response reason is null",
    retrievedRequest.seller_response_reason,
    null,
  );
  // 10. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRequest.updated_at !== null,
  );
  // 11. Validate snapshots array contains initial snapshot
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRequest.snapshots),
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    retrievedRequest.snapshots.length >= 1,
  );
  // 12. Validate initial snapshot content
  const initialSnapshot = retrievedRequest.snapshots[0];
  TestValidator.equals(
    "snapshot status is pending",
    initialSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches",
    initialSnapshot.reason,
    cancellationReason,
  );
  TestValidator.predicate(
    "snapshot seller is null for initial",
    initialSnapshot.seller === null,
  );
  TestValidator.predicate(
    "snapshot created_at exists",
    initialSnapshot.created_at !== null,
  );
}
