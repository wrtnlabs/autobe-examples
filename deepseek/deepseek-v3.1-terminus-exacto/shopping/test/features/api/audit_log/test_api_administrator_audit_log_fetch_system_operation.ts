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

export async function test_api_administrator_audit_log_fetch_system_operation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Generate a random audit log ID to fetch
  const logId = typia.random<string & tags.Format<"uuid">>();
  // Fetch the audit log record
  const auditLog = await api.functional.ecommerce.administrator.audit_logs.at(
    adminConnection,
    {
      logId,
    },
  );
  typia.assert(auditLog);
  // Validate audit log structure and required fields
  TestValidator.equals("audit log has ID", typeof auditLog.id, "string");
  TestValidator.predicate(
    "ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      auditLog.id,
    ),
  );
  TestValidator.equals(
    "event type is populated",
    typeof auditLog.event_type,
    "string",
  );
  TestValidator.predicate(
    "event type is not empty",
    auditLog.event_type.length > 0,
  );
  TestValidator.equals(
    "event subtype is populated",
    typeof auditLog.event_subtype,
    "string",
  );
  TestValidator.predicate(
    "event subtype is not empty",
    auditLog.event_subtype.length > 0,
  );
  TestValidator.equals(
    "severity is populated",
    typeof auditLog.severity,
    "string",
  );
  TestValidator.predicate(
    "severity is not empty",
    auditLog.severity.length > 0,
  );
  TestValidator.equals(
    "severity is valid level",
    ["low", "medium", "high", "critical"].includes(auditLog.severity),
    true,
  );
  TestValidator.equals(
    "action description is populated",
    typeof auditLog.action_description,
    "string",
  );
  TestValidator.predicate(
    "action description is not empty",
    auditLog.action_description.length > 0,
  );
  TestValidator.equals(
    "success flag is boolean",
    typeof auditLog.success,
    "boolean",
  );
  TestValidator.equals(
    "created at is valid date-time",
    typeof auditLog.created_at,
    "string",
  );
  TestValidator.predicate(
    "created at is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(
      auditLog.created_at,
    ),
  );
  // Validate optional security tracking fields
  if (auditLog.ip_address !== null && auditLog.ip_address !== undefined) {
    TestValidator.equals(
      "IP address is string",
      typeof auditLog.ip_address,
      "string",
    );
    TestValidator.predicate(
      "IP address is not empty",
      auditLog.ip_address.length > 0,
    );
  }
  if (auditLog.user_agent !== null && auditLog.user_agent !== undefined) {
    TestValidator.equals(
      "user agent is string",
      typeof auditLog.user_agent,
      "string",
    );
    TestValidator.predicate(
      "user agent is not empty",
      auditLog.user_agent.length > 0,
    );
  }
  // Validate actor information completeness
  TestValidator.predicate(
    "at least one actor field is populated",
    auditLog.customer !== null ||
      auditLog.seller !== null ||
      auditLog.administrator !== null ||
      auditLog.superAdministrator !== null,
  );
  // Validate system operation specific fields
  if (auditLog.context_data !== null && auditLog.context_data !== undefined) {
    TestValidator.equals(
      "context data is string",
      typeof auditLog.context_data,
      "string",
    );
  }
  if (auditLog.error_message !== null && auditLog.error_message !== undefined) {
    TestValidator.equals(
      "error message is string",
      typeof auditLog.error_message,
      "string",
    );
  }
  // Validate resource tracking fields
  if (auditLog.resource_type !== null && auditLog.resource_type !== undefined) {
    TestValidator.equals(
      "resource type is string",
      typeof auditLog.resource_type,
      "string",
    );
  }
  if (auditLog.resource_id !== null && auditLog.resource_id !== undefined) {
    TestValidator.equals(
      "resource ID is string",
      typeof auditLog.resource_id,
      "string",
    );
    TestValidator.predicate(
      "resource ID is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        auditLog.resource_id,
      ),
    );
  }
}
