import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve cancellation request snapshot using admin endpoint
  // Using random UUIDs for requestId and snapshotId to test endpoint response structure
  const snapshot =
    await api.functional.ecommerceMall.admin.cancellation_requests.snapshots.at(
      adminConnection,
      {
        requestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot structure
  TestValidator.equals("snapshot has valid UUID", snapshot.id.length > 0, true);
  TestValidator.equals(
    "snapshot has cancellation request context",
    snapshot.cancellation_request !== null &&
      snapshot.cancellation_request !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot has reason text",
    typeof snapshot.reason === "string",
    true,
  );
  TestValidator.equals(
    "snapshot status is 'approved' or 'rejected'",
    snapshot.status === "approved" || snapshot.status === "rejected",
    true,
  );
  TestValidator.equals(
    "snapshot has created_at timestamp",
    typeof snapshot.created_at === "string",
    true,
  );
  // 4. Validate parent cancellation request context
  const cancellationRequest = snapshot.cancellation_request;
  TestValidator.equals(
    "cancellation request has valid UUID",
    cancellationRequest.id.length > 0,
    true,
  );
  TestValidator.equals(
    "cancellation request has reason",
    typeof cancellationRequest.reason === "string",
    true,
  );
  TestValidator.equals(
    "cancellation request has status",
    typeof cancellationRequest.status === "string",
    true,
  );
  TestValidator.equals(
    "cancellation request has created_at",
    typeof cancellationRequest.created_at === "string",
    true,
  );
  // 5. Validate customer summary in cancellation request
  const customer = cancellationRequest.customer;
  TestValidator.equals(
    "customer summary has valid UUID",
    customer.id.length > 0,
    true,
  );
  TestValidator.equals(
    "customer has email",
    typeof customer.email === "string",
    true,
  );
  TestValidator.equals(
    "customer has status",
    customer.status === "active" || customer.status === "deleted",
    true,
  );
  // 6. Validate seller summary in cancellation request
  const seller = cancellationRequest.seller;
  TestValidator.equals(
    "seller summary has valid UUID",
    seller.id.length > 0,
    true,
  );
  TestValidator.equals(
    "seller has email",
    typeof seller.email === "string",
    true,
  );
  TestValidator.equals(
    "seller has approval status",
    typeof seller.approval_status === "string",
    true,
  );
  // 7. Validate order item summary in cancellation request
  const orderItem = cancellationRequest.orderItem;
  TestValidator.equals(
    "order item has valid UUID",
    orderItem.id.length > 0,
    true,
  );
  TestValidator.equals(
    "order item has status",
    typeof orderItem.status === "string",
    true,
  );
  TestValidator.equals(
    "order item has quantity",
    typeof orderItem.quantity === "number",
    true,
  );
  TestValidator.equals(
    "order item has unit_price",
    typeof orderItem.unit_price === "number",
    true,
  );
  TestValidator.equals(
    "order item has subtotal",
    typeof orderItem.subtotal === "number",
    true,
  );
}
