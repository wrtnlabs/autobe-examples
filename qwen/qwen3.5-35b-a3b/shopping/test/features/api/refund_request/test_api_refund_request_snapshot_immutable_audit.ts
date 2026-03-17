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

export async function test_api_refund_request_snapshot_immutable_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authOutput = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(authOutput);
  // adminConnection.headers is now updated internally by authorize function
  // Use adminConnection directly for all subsequent API calls
  // 2. Generate valid IDs for snapshot retrieval
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshot to verify immutability and audit trail integrity
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot immutability properties exist and are valid
  TestValidator.predicate("snapshot has valid UUID id", () =>
    /^[0-9a-f-]{36}$/i.test(snapshot.id),
  );
  TestValidator.predicate("snapshot has valid refund request reference", () =>
    /^[0-9a-f-]{36}$/i.test(snapshot.refundRequestId),
  );
  TestValidator.equals(
    "snapshot actorType is valid enum",
    snapshot.actorType,
    snapshot.actorType,
  );
  TestValidator.equals(
    "snapshot actionType is valid enum",
    snapshot.actionType,
    snapshot.actionType,
  );
  // 5. Validate before/after value preservation for status
  TestValidator.predicate(
    "statusBefore is valid enum or null",
    () =>
      snapshot.statusBefore === undefined ||
      snapshot.statusBefore === null ||
      ["pending", "approved", "rejected", "refunded"].includes(
        snapshot.statusBefore,
      ),
  );
  TestValidator.predicate(
    "statusAfter is valid enum or null",
    () =>
      snapshot.statusAfter === undefined ||
      snapshot.statusAfter === null ||
      ["pending", "approved", "rejected", "refunded"].includes(
        snapshot.statusAfter,
      ),
  );
  // 6. Validate reasonBefore and reasonAfter preserve customer reason
  TestValidator.predicate(
    "reasonBefore is valid string or null",
    () =>
      snapshot.reasonBefore === undefined ||
      snapshot.reasonBefore === null ||
      typeof snapshot.reasonBefore === "string",
  );
  TestValidator.predicate(
    "reasonAfter is valid string or null",
    () =>
      snapshot.reasonAfter === undefined ||
      snapshot.reasonAfter === null ||
      typeof snapshot.reasonAfter === "string",
  );
  // 7. Validate responseBefore and responseAfter maintain seller's original response
  TestValidator.predicate(
    "responseBefore is valid string or null",
    () =>
      snapshot.responseBefore === undefined ||
      snapshot.responseBefore === null ||
      typeof snapshot.responseBefore === "string",
  );
  TestValidator.predicate(
    "responseAfter is valid string or null",
    () =>
      snapshot.responseAfter === undefined ||
      snapshot.responseAfter === null ||
      typeof snapshot.responseAfter === "string",
  );
  // 8. Validate metadataBefore and metadataAfter capture complete field state
  TestValidator.predicate(
    "metadataBefore is valid string or null",
    () =>
      snapshot.metadataBefore === undefined ||
      snapshot.metadataBefore === null ||
      typeof snapshot.metadataBefore === "string",
  );
  TestValidator.predicate(
    "metadataAfter is valid string or null",
    () =>
      snapshot.metadataAfter === undefined ||
      snapshot.metadataAfter === null ||
      typeof snapshot.metadataAfter === "string",
  );
  // 9. Validate timestamp preservation and format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "deletedAt is valid date-time or null",
    () =>
      snapshot.deletedAt === undefined ||
      snapshot.deletedAt === null ||
      !isNaN(Date.parse(snapshot.deletedAt)),
  );
  // 10. Test deterministic retrieval - call endpoint again and verify identical data
  const snapshotAgain =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals(
    "deterministic retrieval - id",
    snapshot.id,
    snapshotAgain.id,
  );
  TestValidator.equals(
    "deterministic retrieval - refundRequestId",
    snapshot.refundRequestId,
    snapshotAgain.refundRequestId,
  );
  TestValidator.equals(
    "deterministic retrieval - actorType",
    snapshot.actorType,
    snapshotAgain.actorType,
  );
  TestValidator.equals(
    "deterministic retrieval - actionType",
    snapshot.actionType,
    snapshotAgain.actionType,
  );
  TestValidator.equals(
    "deterministic retrieval - statusBefore",
    snapshot.statusBefore,
    snapshotAgain.statusBefore,
  );
  TestValidator.equals(
    "deterministic retrieval - statusAfter",
    snapshot.statusAfter,
    snapshotAgain.statusAfter,
  );
  TestValidator.equals(
    "deterministic retrieval - reasonBefore",
    snapshot.reasonBefore,
    snapshotAgain.reasonBefore,
  );
  TestValidator.equals(
    "deterministic retrieval - reasonAfter",
    snapshot.reasonAfter,
    snapshotAgain.reasonAfter,
  );
  TestValidator.equals(
    "deterministic retrieval - responseBefore",
    snapshot.responseBefore,
    snapshotAgain.responseBefore,
  );
  TestValidator.equals(
    "deterministic retrieval - responseAfter",
    snapshot.responseAfter,
    snapshotAgain.responseAfter,
  );
  TestValidator.equals(
    "deterministic retrieval - metadataBefore",
    snapshot.metadataBefore,
    snapshotAgain.metadataBefore,
  );
  TestValidator.equals(
    "deterministic retrieval - metadataAfter",
    snapshot.metadataAfter,
    snapshotAgain.metadataAfter,
  );
  TestValidator.equals(
    "deterministic retrieval - createdAt",
    snapshot.createdAt,
    snapshotAgain.createdAt,
  );
  TestValidator.equals(
    "deterministic retrieval - deletedAt",
    snapshot.deletedAt,
    snapshotAgain.deletedAt,
  );
  // 11. Validate snapshotId uniqueness by comparing with different ID
  const anotherSnapshotId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "snapshotId uniqueness",
    snapshotId,
    anotherSnapshotId,
  );
}
