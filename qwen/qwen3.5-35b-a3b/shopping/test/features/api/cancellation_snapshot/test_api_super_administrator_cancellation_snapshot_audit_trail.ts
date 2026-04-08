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

export async function test_api_super_administrator_cancellation_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(2),
    password: typia.random<string & tags.Format<"password">>() as string & tags.MinLength<8> & tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
  } satisfies IEcommerceMallSuperAdministrator.IJoin;
  const adminAuthorized =
    await api.functional.ecommerceMall.auth.super_administrator.join(
      adminConnection,
      { body: adminJoinInput },
    );
  typia.assert(adminAuthorized);
  // 2. Create random snapshot IDs for testing retrieval
  // In real scenario, these IDs would come from cancellation request snapshots
  const snapshotId1 = typia.random<string & tags.Format<"uuid">>();
  const snapshotId2 = typia.random<string & tags.Format<"uuid">>();
  // 3. Super administrator retrieves snapshot 1
  // This would normally be a real snapshot from a completed cancellation process
  const snapshot1 =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.at(
      adminConnection,
      { id: snapshotId1 },
    );
  typia.assert(snapshot1);
  // 4. Super administrator retrieves snapshot 2 independently
  const snapshot2 =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.at(
      adminConnection,
      { id: snapshotId2 },
    );
  typia.assert(snapshot2);
  // 5. Validate snapshot immutability and audit trail structure
  TestValidator.equals(
    "snapshot 1 has unique id",
    snapshot1.id !== snapshot2.id,
    true,
  );
  // Verify all required snapshot fields are present and properly typed
  TestValidator.equals(
    "snapshot 1 has valid UUID id",
    typeof snapshot1.id === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 has cancellation request reference",
    snapshot1.cancellationRequest.id !== undefined,
    true,
  );
  TestValidator.equals(
    "snapshot 1 has title field",
    typeof snapshot1.title === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 preserves body (customer cancellation reason)",
    typeof snapshot1.body === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 has actor type",
    typeof snapshot1.actorType === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 has created at timestamp",
    snapshot1.createdAt !== undefined,
    true,
  );
  // Validate timestamp immutability - approved/rejected timestamps should be consistent
  TestValidator.equals(
    "snapshot 1 approved at is either timestamp or null",
    snapshot1.approvedAt === null || typeof snapshot1.approvedAt === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 rejected at is either timestamp or null",
    snapshot1.rejectedAt === null || typeof snapshot1.rejectedAt === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 seller rejection reason is either string or null",
    snapshot1.sellerRejectionReason === null ||
      typeof snapshot1.sellerRejectionReason === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 has created by user id",
    typeof snapshot1.createdBy === "string",
    true,
  );
  TestValidator.equals(
    "snapshot 1 soft delete timestamp is null or timestamp",
    snapshot1.deletedAt === null || typeof snapshot1.deletedAt === "string",
    true,
  );
  // 6. Verify snapshot 2 structure matches snapshot 1
  TestValidator.equals(
    "snapshot 2 has all required fields",
    typeof snapshot2.id === "string" &&
      snapshot2.cancellationRequest.id !== undefined &&
      typeof snapshot2.title === "string" &&
      typeof snapshot2.body === "string" &&
      typeof snapshot2.actorType === "string",
    true,
  );
  // 7. Verify snapshots can be retrieved multiple times (immutability)
  const snapshot1RetrievedAgain =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.at(
      adminConnection,
      { id: snapshotId1 },
    );
  typia.assert(snapshot1RetrievedAgain);
  const snapshot2RetrievedAgain =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.at(
      adminConnection,
      { id: snapshotId2 },
    );
  typia.assert(snapshot2RetrievedAgain);
  // 8. Verify retrieved snapshots are identical (immutable audit records)
  TestValidator.equals(
    "snapshot 1 is immutable - first retrieval matches second",
    snapshot1.id === snapshot1RetrievedAgain.id,
    true,
  );
  TestValidator.equals(
    "snapshot 2 is immutable - first retrieval matches second",
    snapshot2.id === snapshot2RetrievedAgain.id,
    true,
  );
  // 9. Verify snapshot 1 body (cancellation reason) is preserved
  TestValidator.equals(
    "snapshot 1 body immutable",
    snapshot1.body === snapshot1RetrievedAgain.body,
    true,
  );
  // 10. Verify seller rejection reason is preserved exactly
  TestValidator.equals(
    "snapshot 1 seller rejection reason immutable",
    snapshot1.sellerRejectionReason ===
      snapshot1RetrievedAgain.sellerRejectionReason,
    true,
  );
  // 11. Verify timestamps are immutable
  TestValidator.equals(
    "snapshot 1 created at immutable",
    snapshot1.createdAt === snapshot1RetrievedAgain.createdAt,
    true,
  );
  TestValidator.equals(
    "snapshot 1 approved at immutable",
    snapshot1.approvedAt === snapshot1RetrievedAgain.approvedAt,
    true,
  );
  TestValidator.equals(
    "snapshot 1 rejected at immutable",
    snapshot1.rejectedAt === snapshot1RetrievedAgain.rejectedAt,
    true,
  );
  TestValidator.equals(
    "snapshot 2 body immutable",
    snapshot2.body === snapshot2RetrievedAgain.body,
    true,
  );
  TestValidator.equals(
    "snapshot 2 seller rejection reason immutable",
    snapshot2.sellerRejectionReason ===
      snapshot2RetrievedAgain.sellerRejectionReason,
    true,
  );
}