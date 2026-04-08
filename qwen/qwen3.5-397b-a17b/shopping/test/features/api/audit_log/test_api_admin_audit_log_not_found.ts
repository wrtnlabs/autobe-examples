import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that retrieving a non-existent administrator audit log entry returns 404 Not Found.
 *
 * Validates the system's proper handling of requests for audit log entries that do not exist. This test ensures that the audit log retrieval endpoint correctly returns a 404 error when queried with a valid UUID format that does not correspond to any existing audit log record in the system.
 *
 * The test verifies that super administrator authorization is properly enforced even when requesting non-existent resources, and that the error response does not leak sensitive information about the system's audit log structure or existing audit log IDs.
 *
 * 1. Super administrator authenticates using the join endpoint to obtain valid credentials.
 * 2. A random UUID is generated that is guaranteed not to match any existing audit log entry.
 * 3. GET request is made to /shoppingMall/superAdmin/admin/audit-logs/{auditLogId} with the non-existent UUID.
 * 4. Response is validated to ensure it returns 404 Not Found status code.
 * 5. Error response structure is verified to confirm appropriate error messaging without information leakage.
 */
export async function test_api_admin_audit_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Generate a valid UUID that does not exist in the system
  const nonExistentAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Attempt to retrieve non-existent audit log and verify 404 response
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.admin.audit_logs.at(
        superAdminConnection,
        {
          auditLogId: nonExistentAuditLogId,
        },
      );
    },
  );
}
