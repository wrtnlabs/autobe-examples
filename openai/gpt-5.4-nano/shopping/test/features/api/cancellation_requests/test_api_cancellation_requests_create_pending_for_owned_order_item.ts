import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_requests_create_pending_for_owned_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2) Prepare an owned order item by creating an initial cancellation request
  const firstCancellation: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {},
    );
  typia.assert(firstCancellation);
  // 3) Edge: attempt second cancellation request for the same order item with a new reason
  const secondReason: string = RandomGenerator.paragraph({
    sentences: 1,
  });
  const secondCancellation: IShoppingMallCancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {
        body: {
          orderItemId: firstCancellation.shoppingMallOrderItemId,
          reason: secondReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(secondCancellation);
  // 4) Validate workflow initialization invariants for first request
  TestValidator.equals(
    "first request order item id matches orderItem.id",
    firstCancellation.shoppingMallOrderItemId,
    firstCancellation.orderItem.id,
  );
  TestValidator.equals(
    "first request sellerDecisionedAt null",
    firstCancellation.sellerDecisionedAt,
    null,
  );
  TestValidator.equals(
    "first request sellerResponseReason null",
    firstCancellation.sellerResponseReason,
    null,
  );
  TestValidator.equals(
    "first request deletedAt null",
    firstCancellation.deletedAt,
    null,
  );
  TestValidator.predicate(
    "first request updatedAt >= createdAt",
    () =>
      new Date(firstCancellation.updatedAt).getTime() >=
      new Date(firstCancellation.createdAt).getTime(),
  );
  // 5) Validate success response for second request
  TestValidator.equals(
    "second request shoppingMallOrderItemId equals first",
    secondCancellation.shoppingMallOrderItemId,
    firstCancellation.shoppingMallOrderItemId,
  );
  TestValidator.equals(
    "second request reason matches input",
    secondCancellation.reason,
    secondReason,
  );
  TestValidator.equals(
    "second request sellerDecisionedAt null",
    secondCancellation.sellerDecisionedAt,
    null,
  );
  TestValidator.equals(
    "second request sellerResponseReason null",
    secondCancellation.sellerResponseReason,
    null,
  );
  TestValidator.equals(
    "second request deletedAt null",
    secondCancellation.deletedAt,
    null,
  );
  TestValidator.equals(
    "second request orderItem.id matches",
    secondCancellation.orderItem.id,
    firstCancellation.orderItem.id,
  );
  TestValidator.equals(
    "second request orderItem.shopping_mall_order_id matches",
    secondCancellation.orderItem.shopping_mall_order_id,
    firstCancellation.orderItem.shopping_mall_order_id,
  );
  TestValidator.equals(
    "second request orderItem.shopping_mall_product_variant_id matches",
    secondCancellation.orderItem.shopping_mall_product_variant_id,
    firstCancellation.orderItem.shopping_mall_product_variant_id,
  );
  TestValidator.equals(
    "second request orderItem.seller_snapshot_id matches",
    secondCancellation.orderItem.seller_snapshot_id,
    firstCancellation.orderItem.seller_snapshot_id,
  );
  TestValidator.equals(
    "second request orderItem.shopping_mall_shipment_id matches",
    secondCancellation.orderItem.shopping_mall_shipment_id,
    firstCancellation.orderItem.shopping_mall_shipment_id,
  );
  TestValidator.equals(
    "second request orderItem.seller_price_at_purchase matches",
    secondCancellation.orderItem.seller_price_at_purchase,
    firstCancellation.orderItem.seller_price_at_purchase,
  );
  TestValidator.equals(
    "second request orderItem.quantity matches",
    secondCancellation.orderItem.quantity,
    firstCancellation.orderItem.quantity,
  );
  TestValidator.equals(
    "second request orderItem.line_item_status matches",
    secondCancellation.orderItem.line_item_status,
    firstCancellation.orderItem.line_item_status,
  );
  TestValidator.predicate(
    "second request updatedAt >= createdAt",
    () =>
      new Date(secondCancellation.updatedAt).getTime() >=
      new Date(secondCancellation.createdAt).getTime(),
  );
  // Pending workflow state invariants
  TestValidator.predicate(
    "second request status is non-empty",
    () => secondCancellation.status.trim().length > 0,
  );
}
