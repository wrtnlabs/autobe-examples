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

export async function test_api_refund_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup via registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create random snapshot data for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve snapshot using admin connection
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate all snapshot fields
  TestValidator.equals("snapshot id is valid uuid", snapshot.id, snapshotId);
  TestValidator.equals(
    "refund request id is valid uuid",
    snapshot.refundRequestId,
    refundRequestId,
  );
  TestValidator.equals(
    "actor type is valid",
    snapshot.actorType,
    snapshot.actorType,
  );
  TestValidator.equals(
    "action type is valid",
    snapshot.actionType,
    snapshot.actionType,
  );
  TestValidator.predicate(
    "status before is valid or null",
    snapshot.statusBefore === undefined ||
      snapshot.statusBefore === null ||
      ["pending", "approved", "rejected", "refunded"].includes(
        snapshot.statusBefore,
      ),
  );
  TestValidator.predicate(
    "status after is valid or null",
    snapshot.statusAfter === undefined ||
      snapshot.statusAfter === null ||
      ["pending", "approved", "rejected", "refunded"].includes(
        snapshot.statusAfter,
      ),
  );
  TestValidator.predicate(
    "reason before is valid or null",
    typeof snapshot.reasonBefore === "string" ||
      snapshot.reasonBefore === null ||
      snapshot.reasonBefore === undefined,
  );
  TestValidator.predicate(
    "reason after is valid or null",
    typeof snapshot.reasonAfter === "string" ||
      snapshot.reasonAfter === null ||
      snapshot.reasonAfter === undefined,
  );
  TestValidator.predicate(
    "response before is valid or null",
    typeof snapshot.responseBefore === "string" ||
      snapshot.responseBefore === null ||
      snapshot.responseBefore === undefined,
  );
  TestValidator.predicate(
    "response after is valid or null",
    typeof snapshot.responseAfter === "string" ||
      snapshot.responseAfter === null ||
      snapshot.responseAfter === undefined,
  );
  TestValidator.predicate(
    "metadata before is valid or null",
    typeof snapshot.metadataBefore === "string" ||
      snapshot.metadataBefore === null ||
      snapshot.metadataBefore === undefined,
  );
  TestValidator.predicate(
    "metadata after is valid or null",
    typeof snapshot.metadataAfter === "string" ||
      snapshot.metadataAfter === null ||
      snapshot.metadataAfter === undefined,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    snapshot.createdAt !== undefined && !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.predicate(
    "deleted at is null for active snapshot",
    snapshot.deletedAt === null,
  );
  // 5. Verify immutability by retrieving again
  const snapshotAgain =
    await api.functional.ecommerceMall.superAdmin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshotAgain);
  TestValidator.equals("snapshot is immutable", snapshotAgain, snapshot);
}
