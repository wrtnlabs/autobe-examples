import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_order_item_snapshot_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin@1234",
    },
  });
  // 2. Generate random snapshot ID for retrieval test
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin retrieves snapshot
  const snapshot =
    await api.functional.ecommerceMall.admin.order_item_snapshots.at(
      adminConnection,
      {
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure - verify all required fields exist and have correct types
  TestValidator.equals("snapshot has valid UUID id", snapshot.id, snapshotId);
  TestValidator.predicate(
    "orderItem exists and has required fields",
    () =>
      snapshot.orderItem.id !== undefined &&
      typeof snapshot.orderItem.quantity === "number" &&
      typeof snapshot.orderItem.unitPrice === "number",
  );
  TestValidator.predicate(
    "cancellationRequest exists and has required fields",
    () =>
      snapshot.cancellationRequest !== null &&
      snapshot.cancellationRequest.request_status === "approved",
  );
  TestValidator.equals(
    "refundRequest is null for cancellation-triggered snapshot",
    snapshot.refundRequest,
    null,
  );
  TestValidator.predicate(
    "changedBySeller exists with required fields",
    () =>
      snapshot.changedBySeller.id !== undefined &&
      snapshot.changedBySeller.approval_status === "approved",
  );
  TestValidator.equals("oldStatus is paid", snapshot.oldStatus, "paid");
  TestValidator.equals(
    "newStatus is cancelled",
    snapshot.newStatus,
    "cancelled",
  );
  TestValidator.predicate(
    "changeReason is present",
    () => snapshot.changeReason !== null && snapshot.changeReason.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    () => !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    () => !isNaN(Date.parse(snapshot.updatedAt)),
  );
  TestValidator.equals(
    "deletedAt is null for active snapshot",
    snapshot.deletedAt,
    null,
  );
}
