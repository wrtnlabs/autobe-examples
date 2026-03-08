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

export async function test_api_admin_audit_trail_product_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Get a valid product UUID for testing
  // This tests the audit trail retrieval functionality
  const productId = typia.random<string & tags.Format<"uuid">>();
  const recordType = "product" as const;
  // 3. Retrieve the audit trail snapshot
  const snapshot = await api.functional.ecommerceMall.admin.audit_trails.at(
    adminConnection,
    {
      recordType: recordType,
      recordId: productId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate the snapshot structure and data
  TestValidator.equals("recordType is product", snapshot.recordType, "product");
  TestValidator.equals("recordId matches", snapshot.recordId, productId);
  TestValidator.notEquals("snapshot has id", snapshot.id, undefined);
  TestValidator.equals(
    "changedBy is valid uuid",
    snapshot.changedBy.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ) !== null,
    true,
  );
  TestValidator.equals("changes is object", snapshot.changes !== null, true);
  TestValidator.equals(
    "oldValues is object",
    snapshot.oldValues !== null,
    true,
  );
  TestValidator.equals(
    "newValues is object",
    snapshot.newValues !== null,
    true,
  );
  TestValidator.notEquals(
    "changedAt is valid date-time",
    snapshot.changedAt,
    undefined,
  );
  TestValidator.notEquals(
    "createdAt is valid date-time",
    snapshot.createdAt,
    undefined,
  );
  TestValidator.notEquals(
    "updatedAt is valid date-time",
    snapshot.updatedAt,
    undefined,
  );
}
