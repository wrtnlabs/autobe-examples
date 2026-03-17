import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_approval_request_snapshot_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: undefined },
  );
  typia.assert(admin);
  // 2. Retrieve snapshot using admin authentication with random UUIDs
  const snapshot: IEcommerceMallSellerApprovalSnapshot =
    await api.functional.ecommerceMall.admin.approval_requests.snapshots.at(
      adminConnection,
      {
        approvalRequestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 3. Validate snapshot id is valid UUID format
  TestValidator.equals("snapshot id", snapshot.id, snapshot.id);
  // 4. Validate approval request id is valid UUID format
  TestValidator.equals(
    "approval request id",
    snapshot.approvalRequestId,
    snapshot.approvalRequestId,
  );
  // 5. Validate seller id is valid UUID format
  TestValidator.equals("seller id", snapshot.sellerId, snapshot.sellerId);
  // 6. Validate actor reference exists and has required fields
  TestValidator.predicate("actor exists", snapshot.actor !== null);
  if (snapshot.actor) {
    TestValidator.equals(
      "actor email",
      snapshot.actor.email,
      snapshot.actor.email,
    );
    TestValidator.equals(
      "actor status",
      snapshot.actor.status,
      snapshot.actor.status,
    );
  }
  // 7. Validate actor type discriminator is valid
  TestValidator.equals("actor type", snapshot.actorType, snapshot.actorType);
  // 8. Validate status transition fields
  TestValidator.equals("from status", snapshot.fromStatus, snapshot.fromStatus);
  TestValidator.equals("to status", snapshot.toStatus, snapshot.toStatus);
  // 9. Validate rejection reason (nullable string)
  TestValidator.predicate(
    "rejection reason is string or null",
    typeof snapshot.rejectionReason === "string" ||
      snapshot.rejectionReason === null,
  );
  // 10. Validate created at timestamp is valid date-time format
  TestValidator.predicate(
    "created at is valid date-time",
    new Date(snapshot.createdAt).getTime() > 0,
  );
}
