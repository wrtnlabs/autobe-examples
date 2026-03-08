import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order item snapshot retrieval success scenario.
 *
 * This test validates retrieving a valid order item snapshot that exists in the system.
 * The snapshot captures order item status changes triggered by cancellation or refund
 * request approvals/rejections.
 */
export async function test_api_customer_order_item_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins to create authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve order item snapshot using API call
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.customer.order_item_snapshots.at(
      customerConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure and fields
  TestValidator.predicate(
    "snapshot has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate("order item exists", snapshot.orderItem !== null);
  TestValidator.predicate(
    "order reference exists",
    snapshot.orderItem.order !== null,
  );
  TestValidator.predicate(
    "item status is valid enum",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      snapshot.orderItem.itemStatus,
    ),
  );
  TestValidator.predicate(
    "quantity is positive",
    snapshot.orderItem.quantity >= 1,
  );
  TestValidator.predicate(
    "unit price is positive",
    snapshot.orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "old status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      snapshot.oldStatus,
    ),
  );
  TestValidator.predicate(
    "new status is valid",
    ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
      snapshot.newStatus,
    ),
  );
  TestValidator.predicate(
    "old and new status differ",
    snapshot.oldStatus !== snapshot.newStatus,
  );
  TestValidator.predicate(
    "changed by seller exists",
    snapshot.changedBySeller !== null,
  );
  TestValidator.predicate(
    "seller has valid email",
    snapshot.changedBySeller.email !== null,
  );
  TestValidator.predicate(
    "seller approval status is valid",
    ["pending", "approved", "rejected"].includes(
      snapshot.changedBySeller.approval_status,
    ),
  );
  TestValidator.predicate(
    "change reason is string or null",
    snapshot.changeReason === null || typeof snapshot.changeReason === "string",
  );
  TestValidator.predicate(
    "cancellation or refund request reference exists",
    snapshot.cancellationRequest !== null || snapshot.refundRequest !== null,
  );
  TestValidator.predicate(
    "creation timestamp is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.createdAt,
    ),
  );
  TestValidator.predicate(
    "update timestamp is valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.updatedAt,
    ),
  );
  TestValidator.predicate(
    "product snapshot is valid JSON",
    (() => {
      try {
        JSON.parse(snapshot.orderItem.productSnapshot);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "variant snapshot is valid JSON",
    (() => {
      try {
        JSON.parse(snapshot.orderItem.variantSnapshot);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "seller profile snapshot is valid JSON",
    (() => {
      try {
        JSON.parse(snapshot.orderItem.sellerProfileSnapshot);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "order item timestamps are valid",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.orderItem.created_at,
    ) &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        snapshot.orderItem.updated_at,
      ),
  );
  TestValidator.predicate(
    "order has valid order number",
    snapshot.orderItem.order.order_number !== null,
  );
  TestValidator.predicate(
    "order total price is positive",
    snapshot.orderItem.order.total_price > 0,
  );
  TestValidator.predicate(
    "order overall status is valid",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(snapshot.orderItem.order.overall_status),
  );
  // 4. Validate timestamp ordering
  TestValidator.predicate(
    "created_at not after updated_at",
    new Date(snapshot.createdAt) <= new Date(snapshot.updatedAt),
  );
  TestValidator.predicate(
    "seller created_at is valid date",
    new Date(snapshot.changedBySeller.created_at) instanceof Date,
  );
}
