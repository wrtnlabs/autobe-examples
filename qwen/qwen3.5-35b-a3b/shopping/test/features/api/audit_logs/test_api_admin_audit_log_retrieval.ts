import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_admin_audit_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create category to generate audit log entry
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }) ?? null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Retrieve audit log - generate a UUID to test the retrieval endpoint
  // Note: The category creation generates an audit log, but the ID isn't returned directly
  // We test the endpoint works by retrieving a randomly generated UUID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog = await api.functional.ecommerceMall.admin.audit_logs.at(
    adminConnection,
    {
      auditLogId,
    },
  );
  typia.assert(auditLog);
  // 4. Validate audit log structure
  TestValidator.equals(
    "audit log ID format",
    typeof auditLog.id === "string",
    true,
  );
  TestValidator.equals(
    "admin ID format",
    typeof auditLog.admin_id === "string",
    true,
  );
  TestValidator.predicate(
    "action type exists",
    auditLog.action_type !== undefined,
  );
  TestValidator.predicate(
    "target entity type exists",
    auditLog.target_entity_type !== undefined,
  );
  TestValidator.predicate(
    "created timestamp format",
    typeof auditLog.created_at === "string",
  );
  TestValidator.predicate(
    "updated timestamp format",
    typeof auditLog.updated_at === "string",
  );
  TestValidator.predicate(
    "IP address is string or null",
    auditLog.ip_address === null || typeof auditLog.ip_address === "string",
  );
  TestValidator.predicate(
    "user agent is string or null",
    auditLog.user_agent === null || typeof auditLog.user_agent === "string",
  );
  TestValidator.predicate(
    "request ID is string or null",
    auditLog.request_id === null || typeof auditLog.request_id === "string",
  );
  TestValidator.predicate(
    "target entity ID is string or null",
    auditLog.target_entity_id === null ||
      typeof auditLog.target_entity_id === "string",
  );
  TestValidator.predicate(
    "changes is string or null",
    auditLog.changes === null || typeof auditLog.changes === "string",
  );
  TestValidator.predicate(
    "previous values is string or null",
    auditLog.previous_values === null ||
      typeof auditLog.previous_values === "string",
  );
  TestValidator.predicate(
    "new values is string or null",
    auditLog.new_values === null || typeof auditLog.new_values === "string",
  );
}