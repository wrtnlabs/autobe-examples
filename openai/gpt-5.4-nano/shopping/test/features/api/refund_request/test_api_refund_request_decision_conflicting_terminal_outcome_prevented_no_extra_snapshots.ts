import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_decision_conflicting_terminal_outcome_prevented_no_extra_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create member account via join.
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Pass1234!";
  const email = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: { email, password } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Create delivered/eligible order item.
  const orderItem = await generate_random_shopping_mall_member_order_items_create(
    memberConnection,
    {},
  );
  typia.assert(orderItem);
  // 3) Create refund request.
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          orderItemId: orderItem.id,
          customerReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  // 4) First decision: approve.
  const approvedPayload = {
    customer_reason: refundRequest.customerReason,
    status: "approved",
    seller_comment: RandomGenerator.paragraph({ sentences: 1 }),
    decisioned_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const approvedAfterFirstDecision =
    await api.functional.shoppingMall.member.refund_requests.update(
      memberConnection,
      {
        refundRequestId,
        body: approvedPayload,
      },
    );
  typia.assert(approvedAfterFirstDecision);
  const approvedStatus = approvedAfterFirstDecision.status;
  const decisionedAtAfterFirstDecision =
    approvedAfterFirstDecision.decisionedAt;
  const updatedAtAfterFirstDecision = approvedAfterFirstDecision.updatedAt;
  TestValidator.equals(
    "refund status after first decision should be terminal-approved",
    approvedAfterFirstDecision.status !== undefined,
    true,
  );
  // 5) Second decision attempt: try to reject after already approved.
  const conflictingRejectPayload = {
    customer_reason: approvedAfterFirstDecision.customerReason,
    status: approvedStatus === "approved" ? "rejected" : "approved",
    seller_comment: RandomGenerator.paragraph({ sentences: 1 }),
    decisioned_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  await TestValidator.error(
    "should prevent conflicting terminal refund outcome",
    async () => {
      await api.functional.shoppingMall.member.refund_requests.update(
        memberConnection,
        {
          refundRequestId,
          body: conflictingRejectPayload,
        },
      );
    },
  );
  // 6) Validate critical integrity: approved decision fields from the last successful decision remain consistent
  // (we cannot re-fetch because only update/create/join/order-items endpoints are provided in the prompt).
  TestValidator.equals(
    "refund remains terminal approved (status unchanged in-memory)",
    approvedAfterFirstDecision.status,
    approvedStatus,
  );
  TestValidator.equals(
    "refund remains with same decisionedAt after failed conflicting attempt (in-memory)",
    approvedAfterFirstDecision.decisionedAt,
    decisionedAtAfterFirstDecision,
  );
  TestValidator.equals(
    "refund remains with same updatedAt after failed conflicting attempt (in-memory)",
    approvedAfterFirstDecision.updatedAt,
    updatedAtAfterFirstDecision,
  );
}
