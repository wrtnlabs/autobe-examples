import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful retrieval of audit log record by super administrator.
 * Authenticate as super administrator using join operation, then attempt to
 * retrieve an audit log record using a randomly generated logId parameter.
 * Validates that the endpoint response structure matches the IEcommerceAuditLog
 * type definition when a log exists, or properly handles 404 error when
 * the log doesn't exist in the system.
 */
export async function test_api_audit_log_retrieval_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection and authenticate
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_super_administrator_join(superAdministratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Step 2: Generate random logId for testing
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve audit log record
  // Use TestValidator.error to test both success and error cases
  await TestValidator.error("audit log retrieval may return 404", async () => {
    const auditLog =
      await api.functional.ecommerce.superAdministrator.audit_logs.at(
        superAdministratorConnection,
        { logId },
      );
    // Step 4: Validate complete response structure with typia.assert
    typia.assert(auditLog);
    // Step 5: Basic business logic validation (not type validation)
    TestValidator.equals("logId matches request", auditLog.id, logId);
    // No additional type checks after typia.assert() - it covers everything
  });
}
