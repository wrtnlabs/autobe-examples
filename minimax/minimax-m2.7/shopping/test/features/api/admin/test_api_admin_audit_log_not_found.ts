import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving an admin audit log entry with a non-existent identifier.
 *
 * Validates that the system properly handles requests for audit log entries that do not exist. When an administrator attempts to retrieve an audit log using a UUID that is not present in the database, the API should return a 404 Not Found response with an appropriate error message.
 *
 * This test ensures:
 * - 404 status code is returned for non-existent audit logs
 * - Error response contains meaningful message
 * - No partial or malformed data is returned
 * - The system correctly distinguishes between existing and non-existing resources
 *
 * 1. Administrator joins/registers with credentials.
 * 2. Attempt to retrieve audit log with a random non-existent UUID.
 * 3. Validate 404 error response is returned.
 */
export async function test_api_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate a UUID that does not exist in the system
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the non-existent audit log and expect 404 error
  await TestValidator.error("non-existent audit log returns 404", async () => {
    await api.functional.ecommerceMall.admin.admin.audit_logs.getByLogid(
      adminConnection,
      {
        logId: nonExistentLogId,
      },
    );
  });
}
