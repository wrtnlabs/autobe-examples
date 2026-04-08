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
 * Test customer retrieval of post-purchase cancellation request with snapshot audit trail validation.
 *
 * Validates the complete post-purchase cancellation request workflow including seller product setup, customer order placement, cancellation request creation, and snapshot audit trail verification. Ensures that the snapshot audit trail is automatically populated when a cancellation request is submitted and that customers can retrieve their cancellation requests with complete context.
 *
 * Special attention is given to verifying that the initial snapshot captures the request state at creation time, including status, reason, and seller_response fields. The test validates that all nested entities (member, orderItem, seller) are properly resolved in the response.
 *
 * 1. Seller registers and creates product with variant.
 * 2. Member registers, adds variant to cart, and places order.
 * 3. Member creates post-purchase cancellation request with detailed reason.
 * 4. Member retrieves cancellation request by ID.
 * 5. Validates cancellation request details match input and snapshot audit trail is populated.
 */
export async function test_api_post_purchase_cancellation_request_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
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
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 2. Member setup - register, add to cart, place order
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
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
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 3. Create post-purchase cancellation request
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: cancellationReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 4. Retrieve cancellation request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.at(
      memberConnection,
      {
        id: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate cancellation request details
  TestValidator.equals(
    "id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason matches input",
    retrievedRequest.reason,
    cancellationReason,
  );
  TestValidator.predicate(
    "seller_response_reason is null",
    retrievedRequest.seller_response_reason === null ||
      retrievedRequest.seller_response_reason === undefined,
  );
  // 6. Validate snapshot audit trail
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRequest.snapshots),
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    retrievedRequest.snapshots.length >= 1,
  );
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
    "snapshot seller_response is null",
    initialSnapshot.seller_response === null,
  );
  TestValidator.predicate(
    "snapshot created_at is valid",
    initialSnapshot.created_at !== null,
  );
  // 7. Validate nested entities
  TestValidator.predicate("member exists", retrievedRequest.member !== null);
  TestValidator.equals(
    "member id matches",
    retrievedRequest.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "orderItem exists",
    retrievedRequest.orderItem !== null,
  );
  TestValidator.equals(
    "orderItem id matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.predicate("seller exists", retrievedRequest.seller !== null);
  TestValidator.equals(
    "seller id matches",
    retrievedRequest.seller.id,
    product.seller.id,
  );
}
