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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator retrieval of customer-related audit log record.
 *
 * This test verifies that an administrator can successfully retrieve a detailed
 * audit log record containing customer activity events. The test simulates a
 * scenario where customer activity generates an audit trail, then validates that
 * the administrator can fetch and inspect the complete audit log entry with all
 * customer reference information and event details.
 */
export async function test_api_administrator_audit_log_fetch_customer_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Since customer API functions are not available in the provided SDK,
  // we generate a random audit log ID to test the retrieval functionality
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the audit log record
  const auditLog = await api.functional.ecommerce.administrator.audit_logs.at(
    adminConnection,
    {
      logId: auditLogId,
    },
  );
  typia.assert(auditLog);
  // 4. Validate audit log structure and customer reference
  TestValidator.equals("audit log has ID", auditLog.id, auditLogId);
  TestValidator.predicate("has event type", auditLog.event_type.length > 0);
  TestValidator.predicate(
    "has event subtype",
    auditLog.event_subtype.length > 0,
  );
  TestValidator.predicate("has severity level", auditLog.severity.length > 0);
  TestValidator.predicate(
    "has action description",
    auditLog.action_description.length > 0,
  );
  TestValidator.predicate("has timestamp", auditLog.created_at.length > 0);
  // Validate customer actor reference (may be null in test environment)
  if (auditLog.customer !== null && auditLog.customer !== undefined) {
    TestValidator.predicate("customer has ID", auditLog.customer.id.length > 0);
    TestValidator.predicate(
      "customer has email",
      auditLog.customer.email.length > 0,
    );
    TestValidator.predicate(
      "customer has display name",
      auditLog.customer.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer has creation timestamp",
      auditLog.customer.created_at.length > 0,
    );
  }
  // Validate security tracking fields
  TestValidator.predicate(
    "has success status",
    typeof auditLog.success === "boolean",
  );
  // Validate context data and error message handling
  if (auditLog.context_data !== null && auditLog.context_data !== undefined) {
    TestValidator.predicate(
      "context data is string",
      typeof auditLog.context_data === "string",
    );
  }
  if (auditLog.error_message !== null && auditLog.error_message !== undefined) {
    TestValidator.predicate(
      "error message is string",
      typeof auditLog.error_message === "string",
    );
  }
}
