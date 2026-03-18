import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request } from "../../../generate/generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_cancellation_request_detail_customer_owner_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const createdOrder = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(createdOrder);
  const orderItems = createdOrder.orderItems;
  TestValidator.predicate(
    "order should contain at least one order item",
    () => orderItems.length > 0,
  );
  const targetOrderItem = orderItems[0];
  typia.assert(targetOrderItem);
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_cancellation_requests_create_cancellation_request(
      memberConnection,
      {
        body: {
          orderItemId: targetOrderItem.id,
          reason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  await TestValidator.predicate(
    "GET cancellation request detail should be readable for the owner",
    async () => {
      await api.functional.shoppingMall.member.cancellation_requests.at(
        memberConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
      return true;
    },
  );
  TestValidator.equals(
    "cancellation request order item id matches",
    cancellationRequest.shoppingMallOrderItemId,
    targetOrderItem.id,
  );
  TestValidator.equals(
    "cancellation request reason matches",
    cancellationRequest.reason,
    reason,
  );
  TestValidator.predicate(
    "requestedAt exists",
    () => cancellationRequest.requestedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt exists",
    () => cancellationRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists",
    () => cancellationRequest.updatedAt.length > 0,
  );
  if (cancellationRequest.sellerDecisionedAt === null) {
    TestValidator.equals(
      "seller response reason should be null when seller not decided",
      cancellationRequest.sellerResponseReason,
      null,
    );
  } else {
    TestValidator.predicate(
      "seller response reason should be present when decisionedAt exists",
      () => cancellationRequest.sellerResponseReason !== null,
    );
  }
}
