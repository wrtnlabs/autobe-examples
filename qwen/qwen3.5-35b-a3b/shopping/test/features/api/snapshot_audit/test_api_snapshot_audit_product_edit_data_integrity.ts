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

export async function test_api_snapshot_audit_product_edit_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResponse);
  // 2. Admin login with token from join response
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedAdminConnection.headers ??= {};
  authenticatedAdminConnection.headers.Authorization =
    adminResponse.token.access;
  // 3. Generate a valid auditId for pre-populated snapshot audit
  const auditId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // 4. Retrieve snapshot audit record
  const snapshotAudit =
    await api.functional.ecommerceMall.admin.snapshot_audits.at(
      authenticatedAdminConnection,
      { auditId },
    );
  typia.assert(snapshotAudit);
  // 5. Verify recordType is 'product'
  TestValidator.equals(
    "record type is product",
    snapshotAudit.recordType,
    "product",
  );
  // 6. Verify recordId is a valid UUID
  TestValidator.predicate(
    "recordId is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshotAudit.recordId,
    ),
  );
  // 7. Verify changes contains modified fields
  TestValidator.predicate(
    "changes is not empty",
    Object.keys(snapshotAudit.changes).length > 0,
  );
  // 8. Verify oldValues contains original product state
  TestValidator.predicate(
    "oldValues is not empty",
    Object.keys(snapshotAudit.oldValues).length > 0,
  );
  // 9. Verify newValues contains updated product state
  TestValidator.predicate(
    "newValues is not empty",
    Object.keys(snapshotAudit.newValues).length > 0,
  );
  // 10. Verify changedAt is valid date-time
  TestValidator.predicate(
    "changedAt is valid date-time",
    !isNaN(Date.parse(snapshotAudit.changedAt)),
  );
  // 11. Verify changedBy is valid UUID
  TestValidator.predicate(
    "changedBy is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshotAudit.changedBy,
    ),
  );
  // 12. Verify createdAt equals changedAt (immutable snapshot)
  TestValidator.equals(
    "createdAt equals changedAt",
    snapshotAudit.createdAt,
    snapshotAudit.changedAt,
  );
  // 13. Verify updatedAt equals createdAt (immutable snapshot)
  TestValidator.equals(
    "updatedAt equals createdAt",
    snapshotAudit.updatedAt,
    snapshotAudit.createdAt,
  );
  // 14. Verify JSON fields are properly parsed as objects
  TestValidator.predicate(
    "changes is object",
    typeof snapshotAudit.changes === "object",
  );
  TestValidator.predicate(
    "oldValues is object",
    typeof snapshotAudit.oldValues === "object",
  );
  TestValidator.predicate(
    "newValues is object",
    typeof snapshotAudit.newValues === "object",
  );
}
