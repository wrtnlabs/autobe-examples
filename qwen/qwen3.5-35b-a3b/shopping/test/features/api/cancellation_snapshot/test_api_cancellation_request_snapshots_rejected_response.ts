import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
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
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_request_snapshots_rejected_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 4. Customer creates an order with the product
  const orderItem = {
    product_variant_id:
      product.variants[0]?.id ?? typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
  } satisfies IEcommerceMallOrderItem.ICreate;
  // Generate a random shipping address ID for order creation
  const shippingAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddressId,
        order_items: [orderItem],
      },
    },
  );
  typia.assert(order);
  // 5. Customer creates a cancellation request for the order item
  const orderItemId =
    order.items[0]?.id ?? typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await generate_random_ecommerce_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Seller rejects the cancellation request with a rejection reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectionResponse =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        id: cancellationRequest.id,
        body: {
          status: "rejected",
          seller_rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(rejectionResponse);
  TestValidator.equals(
    "cancellation request status rejected",
    rejectionResponse.status,
    "rejected",
  );
  // 7. Customer queries cancellation request snapshots with response_status='rejected' filter
  const snapshotResponse =
    await api.functional.ecommerceMall.member.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          response_status: "rejected",
          limit: 10,
        },
      },
    );
  typia.assert(snapshotResponse);
  // 8. Verify snapshot exists and contains correct rejection data
  TestValidator.predicate(
    "snapshot response contains rejected snapshots",
    snapshotResponse.data.length > 0,
  );
  // Find the specific snapshot for our cancellation request
  const matchingSnapshot = snapshotResponse.data.find(
    (snap) => snap.cancellationRequest.id === cancellationRequest.id,
  );
  TestValidator.notEquals(
    "snapshot exists for rejected request",
    matchingSnapshot,
    null,
  );
  const snapshot = matchingSnapshot!;
  typia.assert(snapshot);
  // Verify rejected_at timestamp is populated
  TestValidator.predicate(
    "rejected_at timestamp populated",
    snapshot.rejected_at !== undefined && snapshot.rejected_at !== null,
  );
  // Verify seller_rejection_reason is populated
  TestValidator.predicate(
    "seller rejection reason is populated",
    snapshot.seller_rejection_reason !== undefined &&
      snapshot.seller_rejection_reason !== null &&
      snapshot.seller_rejection_reason.length > 0,
  );
  // Verify the rejection reason matches what seller provided
  TestValidator.equals(
    "rejection reason matches seller input",
    snapshot.seller_rejection_reason,
    rejectionReason,
  );
  // Verify the snapshot contains original cancellation request details
  TestValidator.equals(
    "cancellation request reference valid",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request reason preserved",
    snapshot.cancellationRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "cancellation request status preserved",
    snapshot.cancellationRequest.status,
    "rejected",
  );
  // Verify approved_at is null (since request was rejected, not approved)
  TestValidator.equals(
    "approved_at is null for rejected request",
    snapshot.approved_at,
    null,
  );
  // Verify actor type is customer
  TestValidator.equals(
    "actor type is customer",
    snapshot.actor_type,
    "customer",
  );
}