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

export async function test_api_admin_audit_trail_refund_request_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Fetch audit trail snapshot for refund request
  const snapshot: IEcommerceMallSnapshotAudit =
    await api.functional.ecommerceMall.admin.audit_trails.at(adminConnection, {
      recordType: "refund_request",
      recordId: typia.random<string & tags.Format<"uuid">>(),
    });
  // 4. Validate response structure
  typia.assert(snapshot);
  // 5. Verify required audit trail fields
  TestValidator.equals(
    "record type is refund_request",
    snapshot.recordType,
    "refund_request",
  );
  TestValidator.predicate(
    "has valid record ID",
    typeof snapshot.recordId === "string",
  );
  TestValidator.predicate(
    "has changes data",
    Object.keys(snapshot.changes).length > 0,
  );
  TestValidator.predicate(
    "has old values data",
    Object.keys(snapshot.oldValues).length > 0,
  );
  TestValidator.predicate(
    "has new values data",
    Object.keys(snapshot.newValues).length > 0,
  );
  TestValidator.predicate(
    "has valid timestamp",
    new Date(snapshot.changedAt).getTime() > 0,
  );
  TestValidator.predicate(
    "has actor ID",
    typeof snapshot.changedBy === "string",
  );
}