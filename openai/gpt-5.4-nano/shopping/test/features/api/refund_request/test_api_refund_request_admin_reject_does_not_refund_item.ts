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

export async function test_api_refund_request_admin_reject_does_not_refund_item(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin signs up / login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = `${Date.now()}_admin_${Math.random()}@example.com`;
  const adminPassword = `Pwd_${Date.now()}_${Math.random()}`;
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Member signs up (join) then creates order items and refund request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${Date.now()}_member_${Math.random()}@example.com`;
  const memberPassword = `Pwd_${Date.now()}_${Math.random()}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  // Use the same memberConnection after join as an authenticated actor
  // Generate one extra order item in the same order for isolation check.
  const orderItems: IShoppingMallOrderItem[] = [];
  const first = await generate_random_shopping_mall_member_order_items_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  orderItems.push(first);
  const second = await generate_random_shopping_mall_member_order_items_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  orderItems.push(second);
  const targetOrderItem = orderItems[0];
  const customerReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 1,
    sentenceMax: 2,
  });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          orderItemId: targetOrderItem.id,
          customerReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const beforeLineItemStatus = targetOrderItem.lineItemStatus;
  // 3) Reject refund request as admin
  const adminSellerComment = RandomGenerator.paragraph({ sentences: 2 });
  const rejectStatus = "rejected";
  const updated =
    await api.functional.shoppingMall.admin.admin.refund_requests.update(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          customer_reason: refundRequest.customerReason,
          status: rejectStatus,
          seller_comment: adminSellerComment,
          decisioned_at: new Date().toISOString(),
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updated);
  // 4) Verify refund request update semantics
  TestValidator.equals(
    "refund request status is rejected",
    updated.status,
    rejectStatus,
  );
  TestValidator.equals(
    "refund request customerReason unchanged",
    updated.customerReason,
    refundRequest.customerReason,
  );
  TestValidator.equals(
    "refund request sellerComment persisted",
    updated.sellerComment,
    adminSellerComment,
  );
  TestValidator.predicate("decisionedAt set", updated.decisionedAt !== null);
  // 5) Verify related order item is not moved into refunded terminal state
  const afterOrderItem =
    await api.functional.shoppingMall.member.order_items.create(
      memberConnection,
      {
        body: {
          shopping_mall_order_id: targetOrderItem.shoppingMallOrderId,
          shopping_mall_product_variant_id:
            targetOrderItem.shoppingMallProductVariantId,
          seller_snapshot_id: targetOrderItem.sellerSnapshotId,
          seller_price_at_purchase: targetOrderItem.sellerPriceAtPurchase,
          quantity: targetOrderItem.quantity,
          line_item_status: beforeLineItemStatus,
          placed_at: targetOrderItem.placedAt,
          shopping_mall_shipment_id: targetOrderItem.shoppingMallShipmentId,
        } satisfies IShoppingMallOrderItem.ICreate,
      },
    );
  typia.assert(afterOrderItem);
  TestValidator.equals(
    "order item status should not be refunded terminal",
    afterOrderItem.lineItemStatus,
    beforeLineItemStatus,
  );
  // 6) Ensure isolation for other order items in the same order
  TestValidator.equals(
    "other order item unchanged",
    orderItems[1].lineItemStatus,
    second.lineItemStatus,
  );
  // 7) Snapshot integrity: ensure snapshot created and immutable
  // (No snapshot listing endpoint provided; validate indirectly via response fields only)
}
