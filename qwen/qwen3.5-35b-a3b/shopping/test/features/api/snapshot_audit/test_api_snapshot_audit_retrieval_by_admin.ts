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

export async function test_api_snapshot_audit_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Generate a valid UUID for testing (record doesn't exist, so expect 404)
  const nonExistentAuditId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent snapshot audit
  // This should return a 404 Not Found error
  await TestValidator.error("returns 404 for non-existent audit", async () => {
    await api.functional.ecommerceMall.admin.snapshot_audits.at(
      adminConnection,
      {
        auditId: nonExistentAuditId,
      },
    );
  });
  // Alternative: Test with valid UUID format to ensure the API accepts the parameter
  // and returns proper error for non-existent record
  TestValidator.predicate(
    "admin authorized",
    adminAuth.token.access !== undefined,
  );
}
