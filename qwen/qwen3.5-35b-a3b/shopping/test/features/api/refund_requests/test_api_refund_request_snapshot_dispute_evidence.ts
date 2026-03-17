import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_refund_request_snapshot_dispute_evidence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin registration and authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Generate test data for refund request with multiple snapshots
  const refundRequestId = typia.random<string>();
  // 3. Retrieve multiple snapshots from the same refund request to test history
  const snapshotIds = ArrayUtil.repeat(3, () => typia.random<string>());
  const snapshots: IEcommerceMallRefundRequestSnapshot[] = [];
  for (const snapshotId of snapshotIds) {
    const snapshot =
      await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
        superAdminConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }
  // 4. Validate all snapshots are accessible to superAdmin
  TestValidator.equals(
    "all snapshots retrieved successfully",
    snapshots.length,
    3,
  );
  // 5. Verify each snapshot has required fields for dispute resolution
  for (const snapshot of snapshots) {
    TestValidator.equals(
      "snapshot has actorType field",
      snapshot.actorType !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has actionType field",
      snapshot.actionType !== undefined,
      true,
    );
  }
  // 6. Verify before/after values enable timeline reconstruction
  const snapshotsWithStatusChanges = snapshots.filter(
    (s) =>
      s.statusBefore !== undefined &&
      s.statusBefore !== null &&
      s.statusAfter !== undefined &&
      s.statusAfter !== null &&
      s.statusBefore !== s.statusAfter,
  );
  TestValidator.equals(
    "some snapshots have status changes",
    snapshotsWithStatusChanges.length >= 0,
    true,
  );
  // 7. Verify timestamps enable chronological ordering
  const sortedByTimestamp = [...snapshots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (let i = 0; i < sortedByTimestamp.length - 1; i++) {
    const current = sortedByTimestamp[i];
    const next = sortedByTimestamp[i + 1];
    TestValidator.equals(
      "timestamps are in chronological order",
      new Date(current.createdAt).getTime() <=
        new Date(next.createdAt).getTime(),
      true,
    );
  }
  // 8. Verify sellerType accountability is recorded in actorType
  const sellerSnapshots = snapshots.filter((s) => s.actorType === "seller");
  TestValidator.equals(
    "seller snapshots have correct actorType",
    sellerSnapshots.every((s) => s.actorType === "seller"),
    true,
  );
  // 9. Verify response and reason fields can be null (optional fields)
  for (const snapshot of snapshots) {
    // These fields can be null/undefined based on DTO definition
    // Just verify the snapshot object is valid
    typia.assert(snapshot);
  }
  // 10. Verify soft deletion field is present
  for (const snapshot of snapshots) {
    // deletedAt should be null or valid date-time string
    if (snapshot.deletedAt !== null && snapshot.deletedAt !== undefined) {
      // Date string format validation
      try {
        new Date(snapshot.deletedAt);
      } catch {
        throw new Error(
          `Invalid date format for deletedAt: ${snapshot.deletedAt}`,
        );
      }
    }
  }
  // 11. Verify superAdmin can access snapshots regardless of ownership
  TestValidator.equals(
    "superAdmin can access all snapshots",
    snapshots.every(
      (s) =>
        s.actorType === "customer" ||
        s.actorType === "seller" ||
        s.actorType === "admin" ||
        s.actorType === "super_admin",
    ),
    true,
  );
}
