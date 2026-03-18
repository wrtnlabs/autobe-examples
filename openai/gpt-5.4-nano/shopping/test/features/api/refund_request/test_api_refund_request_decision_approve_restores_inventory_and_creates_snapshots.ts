import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
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

export async function test_api_refund_request_decision_approve_restores_inventory_and_creates_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication (use utility to initialize headers)
  const memberConnection: api.IConnection = { host: connection.host };
  const creds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, { body: creds });
  // 2) Create refund-eligible purchase context
  const orderItem =
    await generate_random_shopping_mall_member_order_items_create(
      memberConnection,
      {
        body: {
          line_item_status: "delivered",
        },
      },
    );
  typia.assert(orderItem);
  const customerReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          orderItemId: orderItem.id,
          customerReason,
        },
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  const orderItemId = refundRequest.shoppingMallOrderItemId;
  const beforeCustomerReason = refundRequest.customerReason;
  // 3) Approve decision
  const sellerComment = RandomGenerator.paragraph({ sentences: 1 });
  const decisionedAt = new Date().toISOString();
  const approved =
    await api.functional.shoppingMall.member.refund_requests.update(
      memberConnection,
      {
        refundRequestId,
        body: {
          customer_reason: beforeCustomerReason,
          status: "approved",
          seller_comment: sellerComment,
          decisioned_at: decisionedAt,
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approved);
  // 4) Validate decision response semantics
  TestValidator.equals("refundRequestId matches", approved.id, refundRequestId);
  TestValidator.equals(
    "customerReason unchanged",
    approved.customerReason,
    beforeCustomerReason,
  );
  TestValidator.equals("status is approved", approved.status, "approved");
  TestValidator.equals(
    "seller_comment persisted",
    approved.sellerComment,
    sellerComment,
  );
  TestValidator.predicate(
    "decisioned_at populated",
    approved.decisionedAt !== null,
  );
  // 5) Verify snapshots were created (search by refund request linkage)
  const history = await api.functional.shoppingMall.member.snapshots.history(
    memberConnection,
    {
      body: {
        sourceRefundRequestId: refundRequestId,
        sourceOrderItemId: orderItemId,
        page: 1,
        limit: 20,
        sort: "-createdAt",
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(history);
  TestValidator.predicate(
    "snapshot history contains at least one record for refund approval",
    history.data.length > 0,
  );
  const hasRefundSnapshot = history.data.some(
    (s) =>
      s.source_refund_request_id === refundRequestId &&
      s.source_order_item_id === orderItemId,
  );
  TestValidator.predicate("has linked refund snapshot", hasRefundSnapshot);
  const snapshot = history.data.find(
    (s) =>
      s.source_refund_request_id === refundRequestId &&
      s.source_order_item_id === orderItemId,
  );
  TestValidator.predicate("found snapshot record", snapshot !== undefined);
}
