import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account using utility function
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  // 2. Create admin connection with authentication token for subsequent requests
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: administrator.token.access,
    },
  };
  // 3. Retrieve a cancellation request snapshot
  // Note: This endpoint requires a valid snapshot ID. For E2E demonstration,
  // we use a generated UUID. In production, this would be an actual snapshot
  // ID from a pre-approved cancellation request.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.administrator.cancellation_request_snapshots.at(
      adminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and approved state
  // Validate snapshot ID matches requested ID
  TestValidator.equals(
    "snapshot id matches requested id",
    snapshot.id,
    snapshotId,
  );
  // Validate cancellation request reference exists
  typia.assert(snapshot.cancellationRequest);
  TestValidator.predicate(
    "cancellation request has id",
    snapshot.cancellationRequest.id.length === 36,
  );
  // Validate snapshot title field
  TestValidator.predicate(
    "snapshot has valid title",
    snapshot.title.length > 0 && snapshot.title.length <= 200,
  );
  // Validate body field contains customer's original cancellation reason
  TestValidator.predicate(
    "snapshot has customer cancellation reason",
    snapshot.body.length > 0 && snapshot.body.length <= 1000,
  );
  // Validate actor type is customer (for cancellation requests)
  TestValidator.equals(
    "actor type is customer",
    snapshot.actorType,
    "customer",
  );
  // Validate createdAt timestamp is present and valid
  TestValidator.predicate(
    "snapshot has valid created timestamp",
    new Date(snapshot.createdAt).getTime() > 0,
  );
  // CRITICAL: Validate approved state - approvedAt is NOT null (seller approved)
  TestValidator.predicate(
    "snapshot has approval timestamp (seller approved)",
    snapshot.approvedAt !== null && snapshot.approvedAt !== undefined,
  );
  // Validate approvedAt is a valid ISO date-time
  const approvedDate = new Date(snapshot.approvedAt!);
  TestValidator.predicate(
    "approval timestamp is valid date-time",
    !isNaN(approvedDate.getTime()),
  );
  // CRITICAL: Validate rejectedAt is null (seller did not reject)
  TestValidator.equals(
    "rejectedAt is null for approved snapshot",
    snapshot.rejectedAt,
    null,
  );
  // CRITICAL: Validate sellerRejectionReason is null (no rejection reason for approved)
  TestValidator.equals(
    "sellerRejectionReason is null for approved snapshot",
    snapshot.sellerRejectionReason,
    null,
  );
  // Validate createdBy is present (user ID who created the snapshot)
  TestValidator.predicate(
    "snapshot has creator id",
    snapshot.createdBy.length > 0 && snapshot.createdBy.length <= 36,
  );
  // Validate snapshot is active (not soft-deleted)
  TestValidator.equals(
    "snapshot is not soft-deleted",
    snapshot.deletedAt,
    null,
  );
  // Validate cancellation request summary structure
  TestValidator.predicate(
    "cancellation request has customer reason",
    snapshot.cancellationRequest.reason.length > 0 &&
      snapshot.cancellationRequest.reason.length <= 1000,
  );
  TestValidator.equals(
    "cancellation request status is approved",
    snapshot.cancellationRequest.status, // Should be 'approved'
    "approved",
  );
  TestValidator.predicate(
    "cancellation request has valid created_at",
    new Date(snapshot.cancellationRequest.created_at).getTime() > 0,
  );
  // Validate order item reference
  typia.assert(snapshot.cancellationRequest.item);
  TestValidator.predicate(
    "order item has valid quantity",
    snapshot.cancellationRequest.item.quantity >= 1,
  );
  // Validate order item status is cancelled (after approval)
  TestValidator.equals(
    "order item status is cancelled",
    snapshot.cancellationRequest.item.status,
    "cancelled",
  );
  // Validate order reference
  typia.assert(snapshot.cancellationRequest.order);
  TestValidator.predicate(
    "order has valid order_number",
    /^[A-Z]{3}-\d{8}-\d+$/.test(
      snapshot.cancellationRequest.order.order_number,
    ),
  );
  TestValidator.predicate(
    "order has valid total_price",
    snapshot.cancellationRequest.order.total_price > 0,
  );
  // Note: customer data is not available in cancellation request summary
  // Validate seller reference
  typia.assert(snapshot.cancellationRequest.seller);
  TestValidator.equals(
    "seller is approved",
    snapshot.cancellationRequest.seller.approval_status,
    "approved",
  );
  // Validate timestamps consistency: approval occurred after creation
  const creationTime = new Date(snapshot.createdAt).getTime();
  const approvalTime = new Date(snapshot.approvedAt!).getTime();
  TestValidator.predicate(
    "approval occurred after snapshot creation",
    approvalTime >= creationTime,
  );
  // Additional validation: approval occurred within reasonable timeframe (e.g., 30 days)
  const maxApprovalTime = creationTime + 30 * 24 * 60 * 60 * 1000; // 30 days
  TestValidator.predicate(
    "approval occurred within 30 days of creation",
    approvalTime <= maxApprovalTime,
  );
}