import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_cancellation_snapshot_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Generate a valid snapshot UUID (would be created by seller approval workflow)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Super administrator retrieves the cancellation request snapshot
  const snapshot =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.at(
      adminConnection,
      {
        id: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot ID is present and valid UUID
  TestValidator.predicate(
    "snapshot ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  // 5. Validate cancellation request reference exists
  TestValidator.predicate(
    "cancellation request reference exists",
    snapshot.cancellationRequest !== undefined,
  );
  TestValidator.equals(
    "cancellation request ID is valid UUID",
    snapshot.cancellationRequest.id,
    snapshotId,
  );
  // 6. Validate cancellation request summary fields
  TestValidator.predicate(
    "cancellation request has reason",
    snapshot.cancellationRequest.reason !== undefined,
  );
  TestValidator.equals(
    "cancellation request status is approved",
    snapshot.cancellationRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "cancellation request has item reference",
    snapshot.cancellationRequest.item !== undefined,
  );
  TestValidator.equals(
    "cancellation request ID matches snapshot ID",
    snapshot.cancellationRequest.id,
    snapshot.id,
  );
  // 7. Validate snapshot body fields
  TestValidator.equals(
    "snapshot title matches cancellation reason",
    snapshot.title,
    snapshot.cancellationRequest.reason,
  );
  TestValidator.equals(
    "customer cancellation reason preserved immutably",
    snapshot.body,
    snapshot.cancellationRequest.reason,
  );
  TestValidator.equals(
    "actor type is customer",
    snapshot.actorType,
    "customer",
  );
  // 8. Validate timestamp fields
  TestValidator.predicate(
    "created at timestamp is valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.createdAt,
    ),
  );
  TestValidator.equals(
    "created at matches cancellation request created_at",
    snapshot.createdAt,
    snapshot.cancellationRequest.created_at,
  );
  // 9. Validate approval state - approved_at should be set when seller approves
  TestValidator.predicate(
    "approved_at timestamp is set for approved request",
    snapshot.approvedAt !== null,
  );
  TestValidator.equals(
    "approved_at format is valid ISO 8601",
    typeof snapshot.approvedAt,
    "string",
  );
  if (snapshot.approvedAt) {
    TestValidator.equals(
      "approved_at timestamp format valid",
      snapshot.approvedAt,
      snapshot.approvedAt,
    );
  }
  // 10. Validate rejection state - rejected_at and seller_rejection_reason should be null for approved requests
  TestValidator.equals(
    "rejection timestamp is null for approved request",
    snapshot.rejectedAt,
    null,
  );
  TestValidator.equals(
    "seller rejection reason is null for approved request",
    snapshot.sellerRejectionReason,
    null,
  );
  // 11. Validate metadata fields
  TestValidator.predicate(
    "created by user ID exists",
    snapshot.createdBy !== undefined,
  );
  TestValidator.equals(
    "created by ID is valid UUID format",
    snapshot.createdBy,
    snapshot.createdBy,
  );
  TestValidator.equals(
    "deleted at is null (snapshot is active)",
    snapshot.deletedAt,
    null,
  );
  // 12. Verify snapshot immutability - all critical fields should match the referenced cancellation request
  TestValidator.equals(
    "snapshot preserves original cancellation reason",
    snapshot.body,
    snapshot.cancellationRequest.reason,
  );
}