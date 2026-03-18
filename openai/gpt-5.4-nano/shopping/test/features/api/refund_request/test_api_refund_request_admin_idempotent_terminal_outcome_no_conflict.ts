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

export async function test_api_refund_request_admin_idempotent_terminal_outcome_no_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Generate an order item that supports refund workflow.
  const orderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: undefined,
      },
    );
  typia.assert(orderItem);
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
  // Idempotent approval decision retry.
  const sellerComment = RandomGenerator.paragraph({ sentences: 1 });
  const approvedStatus = "approved";
  const decisionBody = {
    customer_reason: refundRequest.customerReason,
    status: approvedStatus,
    seller_comment: sellerComment,
    decisioned_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const firstUpdate =
    await api.functional.shoppingMall.admin.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: decisionBody,
      },
    );
  typia.assert(firstUpdate);
  const firstStatus = firstUpdate.status;
  TestValidator.equals(
    "refund request terminal status after first update",
    firstStatus,
    approvedStatus,
  );
  TestValidator.equals(
    "order item line status after first update remains refunded (server-driven)",
    firstUpdate.status,
    firstStatus,
  );
  const secondUpdate =
    await api.functional.shoppingMall.admin.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: decisionBody,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "refund request terminal status after second update",
    secondUpdate.status,
    firstStatus,
  );
  TestValidator.equals(
    "idempotency: refund request decision comment stable",
    secondUpdate.sellerComment,
    firstUpdate.sellerComment,
  );
  // Conflicting transition: reject after approve.
  const conflictingBody = {
    customer_reason: refundRequest.customerReason,
    status: "rejected",
    seller_comment: RandomGenerator.paragraph({ sentences: 1 }),
    decisioned_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  await TestValidator.error(
    "conflicting transition should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.admin.refund_requests.update(
        adminConnection,
        {
          refundRequestId: refundRequest.id,
          body: conflictingBody,
        },
      );
    },
  );
}
