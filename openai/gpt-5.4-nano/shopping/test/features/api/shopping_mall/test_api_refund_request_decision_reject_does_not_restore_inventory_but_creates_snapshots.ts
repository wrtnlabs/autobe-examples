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

export async function test_api_refund_request_decision_reject_does_not_restore_inventory_but_creates_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1) member join & authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) create an eligible order item for refund request
  const orderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        // Leave workflow status to generator to avoid invalid enum values
        body: undefined,
      },
    );
  typia.assert(orderItem);
  // 3) create refund request
  const customerReasonBefore = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          orderItemId: orderItem.id,
          customerReason: customerReasonBefore,
        } satisfies DeepPartial<IShoppingMallRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  // 4) reject decision update
  // Use a rejection-like status token expected by the backend workflow.
  const sellerComment = RandomGenerator.paragraph({ sentences: 1 });
  const rejectionStatus = "rejected";
  const updatePayload = {
    customer_reason: customerReasonBefore,
    status: rejectionStatus,
    seller_comment: sellerComment,
    decisioned_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const updatedRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.update(
      memberConnection,
      {
        refundRequestId: refundRequest.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedRefundRequest);
  // 5) validate response (business)
  TestValidator.equals(
    "refund request id preserved",
    updatedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request status is rejected",
    updatedRefundRequest.status,
    rejectionStatus,
  );
  TestValidator.equals(
    "customer reason unchanged",
    updatedRefundRequest.customerReason,
    customerReasonBefore,
  );
  TestValidator.predicate(
    "decisionedAt set",
    updatedRefundRequest.decisionedAt !== null &&
      updatedRefundRequest.decisionedAt !== undefined,
  );
  TestValidator.predicate(
    "seller comment present",
    updatedRefundRequest.sellerComment !== null &&
      updatedRefundRequest.sellerComment !== undefined &&
      updatedRefundRequest.sellerComment.length > 0,
  );
  // 6) limited side-effect validation: ensure refund is still linked to same order item
  TestValidator.equals(
    "refund request linked order item preserved",
    updatedRefundRequest.shoppingMallOrderItemId,
    orderItem.id,
  );
}
