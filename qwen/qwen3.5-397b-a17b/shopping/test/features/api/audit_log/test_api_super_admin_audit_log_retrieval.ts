import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminAuditLog";
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
 * Test super administrator audit log retrieval with pagination.
 *
 * Validates that a super administrator can successfully retrieve their audit log history with proper pagination support. The test verifies the complete authentication flow, audit log retrieval, and response structure validation including pagination metadata and audit log entry fields.
 *
 * The test ensures that audit logs are properly sorted by creation timestamp in descending order and that each entry contains all required fields including the super administrator's identification information.
 *
 * 1. Super administrator registers with unique credentials using join endpoint.
 * 2. Retrieves audit logs with default pagination parameters.
 * 3. Validates pagination metadata structure and values.
 * 4. Validates each audit log entry contains required fields.
 * 5. Verifies audit logs are sorted by created_at in descending order.
 * 6. Confirms superAdmin field contains correct administrator information.
 */
export async function test_api_super_admin_audit_log_retrieval(
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
  // 2. Retrieve audit logs with pagination
  const auditLogResponse =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogResponse);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page >= 1",
    auditLogResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit within bounds",
    auditLogResponse.pagination.limit >= 1 &&
      auditLogResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count non-negative",
    auditLogResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    auditLogResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length within limit",
    auditLogResponse.data.length <= auditLogResponse.pagination.limit,
  );
  // Validate pages calculation is correct
  const expectedPages =
    auditLogResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          auditLogResponse.pagination.records /
            auditLogResponse.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation correct",
    auditLogResponse.pagination.pages,
    expectedPages,
  );
  // 4. Validate each audit log entry contains required fields
  for (const log of auditLogResponse.data) {
    TestValidator.predicate(
      "action_type is non-empty string",
      log.action_type.length > 0,
    );
    TestValidator.predicate(
      "target_model is non-empty string",
      log.target_model.length > 0,
    );
    TestValidator.predicate(
      "ip_address is non-empty string",
      log.ip_address.length > 0,
    );
    TestValidator.predicate(
      "response_status is valid HTTP status",
      log.response_status >= 100 && log.response_status < 600,
    );
    // Validate superAdmin field
    TestValidator.equals(
      "superAdmin id matches auth result",
      log.superAdmin.id,
      authResult.id,
    );
    TestValidator.equals(
      "superAdmin email matches auth result",
      log.superAdmin.email,
      authResult.email,
    );
  }
  // 5. Verify audit logs are sorted by created_at in descending order (newest first)
  if (auditLogResponse.data.length > 1) {
    for (let i = 0; i < auditLogResponse.data.length - 1; i++) {
      const currentLog = auditLogResponse.data[i];
      const nextLog = auditLogResponse.data[i + 1];
      TestValidator.predicate(
        `logs sorted descending: index ${i} >= ${i + 1}`,
        new Date(currentLog.created_at).getTime() >=
          new Date(nextLog.created_at).getTime(),
      );
    }
  }
}
