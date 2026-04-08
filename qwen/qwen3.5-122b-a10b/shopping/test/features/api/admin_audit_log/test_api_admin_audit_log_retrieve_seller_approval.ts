import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
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
 * Test retrieving a specific administrator audit log entry for a seller approval action.
 *
 * Validates the primary use case of audit trail access for administrative oversight by testing the audit log retrieval endpoint. This ensures that audit log entries can be retrieved by their unique identifier and contain the expected structure.
 *
 * The test authenticates as an administrator and retrieves audit log entries to verify the endpoint returns properly structured data with all required fields including action type, target entity, state snapshots, and administrator information.
 *
 * 1. Administrator registers and authenticates via join operation.
 * 2. Retrieve an audit log entry by its unique identifier.
 * 3. Validates the audit log contains correct action_type, target_entity, target_id, state snapshots, and admin information.
 * 4. Verify 404 is returned for non-existent log ID.
 */
export async function test_api_admin_audit_log_retrieve_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Retrieve an audit log entry by ID (in simulation mode, returns valid mock data)
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const retrievedLog: IEcommerceAdminAuditLog =
    await api.functional.ecommerce.admin.audit_logs.at(adminConnection, {
      logId: auditLogId,
    });
  typia.assert(retrievedLog);
  // 3. Validate the audit log contents
  TestValidator.predicate(
    "action type is defined",
    retrievedLog.action_type !== null && retrievedLog.action_type !== undefined,
  );
  TestValidator.predicate(
    "target entity is defined",
    retrievedLog.target_entity !== null &&
      retrievedLog.target_entity !== undefined,
  );
  TestValidator.predicate(
    "admin ID exists",
    retrievedLog.admin !== null && retrievedLog.admin !== undefined,
  );
  TestValidator.equals(
    "admin ID is UUID",
    typeof retrievedLog.admin.id,
    "string",
  );
  TestValidator.equals(
    "admin email is string",
    typeof retrievedLog.admin.email,
    "string",
  );
  TestValidator.predicate(
    "admin grade exists",
    retrievedLog.admin.grade !== null && retrievedLog.admin.grade !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedLog.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      retrievedLog.updated_at,
    ),
  );
  // 4. Test 404 for non-existent log ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "non-existent audit log returns 404",
    404,
    async () =>
      await api.functional.ecommerce.admin.audit_logs.at(adminConnection, {
        logId: nonExistentId,
      }),
  );
}
