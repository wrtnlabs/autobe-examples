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
 * Test the successful retrieval of a super administrator audit log entry.
 *
 * Validates the complete audit log retrieval flow including super administrator authentication and audit log access. Ensures that the response contains all required fields for security compliance and forensic analysis.
 *
 * Special attention is given to verifying that the superAdmin object in the response contains proper identification fields (id, email) and that all timestamps are in ISO 8601 format. The test validates the structure and data integrity of audit trail records.
 *
 * 1. Super administrator registers and authenticates via join endpoint.
 * 2. Retrieve a specific audit log entry using a valid UUID.
 * 3. Validates audit log response structure via typia.assert() which verifies all required fields: id, superAdmin, action_type, target_model, target_id, ip_address, user_agent, request_body, response_status, created_at, updated_at, deleted_at.
 * 4. Confirms superAdmin object contains id and email with proper formats.
 * 5. Verifies timestamps are in ISO 8601 date-time format through typia validation.
 */
export async function test_api_super_admin_audit_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve audit log entry
  const auditLog =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(auditLog);
}
