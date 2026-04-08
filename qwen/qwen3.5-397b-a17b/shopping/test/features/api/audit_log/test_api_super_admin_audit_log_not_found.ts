import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator audit log retrieval for non-existent entry.
 *
 * Validates that the system properly returns a 404 Not Found response when a super administrator attempts to retrieve an audit log entry that does not exist. This ensures the audit system correctly handles requests for non-existent records and maintains data integrity.
 *
 * The test first authenticates a super administrator through the join endpoint, then attempts to fetch an audit log using a randomly generated UUID that does not correspond to any existing audit log record. The expected behavior is a 404 HTTP error response.
 *
 * 1. Super administrator registers and authenticates via join endpoint.
 * 2. Generate a valid UUID format that does not exist in the database.
 * 3. Attempt to retrieve the non-existent audit log.
 * 4. Validate that the system returns 404 Not Found status code.
 */
export async function test_api_super_admin_audit_log_not_found(
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
  // 2. Generate a non-existent audit log UUID
  const nonExistentAuditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent audit log and validate 404 response
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.at(
        superAdminConnection,
        {
          auditLogId: nonExistentAuditLogId,
        },
      );
    },
  );
}
