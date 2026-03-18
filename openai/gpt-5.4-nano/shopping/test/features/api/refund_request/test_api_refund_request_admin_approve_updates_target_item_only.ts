import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_order_items_create } from "../../../generate/generate_random_shopping_mall_member_order_items_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_request_admin_approve_updates_target_item_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin joins to obtain admin access.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Member joins to obtain a member account.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 3) Create a target order item and a refund request.
  const targetOrderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: {
          line_item_status: "delivered",
        } satisfies DeepPartial<IShoppingMallOrderItem.ICreate>,
      },
    );
  typia.assert(targetOrderItem);
  const customerReason = RandomGenerator.paragraph({ sentences: 1 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          orderItemId: targetOrderItem.id,
          customerReason,
        } satisfies DeepPartial<IShoppingMallRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  const sellerComment = RandomGenerator.paragraph({ sentences: 2 });
  // 4) Approve/refund the refund request.
  const initialStatus = refundRequest.status;
  const approvedResponse =
    await api.functional.shoppingMall.admin.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          customer_reason: customerReason,
          status: "approved",
          seller_comment: sellerComment,
          decisioned_at: new Date().toISOString(),
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedResponse);
  // 5) Verify response reflects the updated refund request.
  TestValidator.notEquals(
    "refund request status moved out of initial state",
    approvedResponse.status,
    initialStatus,
  );
  TestValidator.equals(
    "refund request links to the targeted order item",
    approvedResponse.shoppingMallOrderItemId,
    targetOrderItem.id,
  );
  TestValidator.equals(
    "refund request customer reason persisted",
    approvedResponse.customerReason,
    customerReason,
  );
  TestValidator.equals(
    "refund request seller comment persisted",
    approvedResponse.sellerComment,
    sellerComment,
  );
  TestValidator.predicate(
    "refund request decisionedAt set",
    approvedResponse.decisionedAt !== null,
  );
  // 9) Idempotency: re-submit the same admin decision update.
  const secondResponse =
    await api.functional.shoppingMall.admin.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          customer_reason: customerReason,
          status: "approved",
          seller_comment: sellerComment,
          decisioned_at: approvedResponse.decisionedAt satisfies
            | (string & tags.Format<"date-time">)
            | null as any,
        },
      } as unknown as {
        refundRequestId: string & tags.Format<"uuid">;
        body: IShoppingMallRefundRequest.IUpdate;
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "idempotent status",
    secondResponse.status,
    approvedResponse.status,
  );
  TestValidator.equals(
    "idempotent seller comment",
    secondResponse.sellerComment,
    approvedResponse.sellerComment,
  );
  TestValidator.equals(
    "idempotent decisionedAt",
    secondResponse.decisionedAt,
    approvedResponse.decisionedAt,
  );
}
