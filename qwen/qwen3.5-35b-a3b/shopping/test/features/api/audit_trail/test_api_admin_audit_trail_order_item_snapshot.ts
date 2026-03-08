import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_trail_order_item_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate random order item record data
  const recordId = typia.random<string & tags.Format<"uuid">>();
  const recordType = "order_item" as const;
  // 3. Retrieve audit trail snapshot for the order item
  const auditTrail = await api.functional.ecommerceMall.admin.audit_trails.at(
    adminConnection,
    {
      recordType: recordType,
      recordId: recordId,
    },
  );
  typia.assert(auditTrail);
  // 4. Validate audit trail response structure
  TestValidator.equals(
    "record type matches order_item",
    auditTrail.recordType,
    recordType,
  );
  TestValidator.equals("record id matches", auditTrail.recordId, recordId);
  // 5. Validate UUID format for id and changedBy
  typia.assert(auditTrail.id);
  typia.assert(auditTrail.changedBy);
  // 6. Validate timestamps are valid date-time format
  typia.assert(auditTrail.changedAt);
  typia.assert(auditTrail.createdAt);
  typia.assert(auditTrail.updatedAt);
  // 7. Validate changes, oldValues, and newValues are non-empty objects
  TestValidator.predicate(
    "changes object has entries",
    () => Object.keys(auditTrail.changes).length > 0,
  );
  TestValidator.predicate(
    "oldValues object has entries",
    () => Object.keys(auditTrail.oldValues).length > 0,
  );
  TestValidator.predicate(
    "newValues object has entries",
    () => Object.keys(auditTrail.newValues).length > 0,
  );
  // 8. Validate all values in changes, oldValues, and newValues are strings
  typia.assert(auditTrail.changes);
  typia.assert(auditTrail.oldValues);
  typia.assert(auditTrail.newValues);
}
