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
 * Test comprehensive validation of a complete audit log record structure for super administrator actions.
 *
 * Validates the complete audit log retrieval workflow including super administrator authentication, audit log access, and comprehensive field validation. Ensures that all audit log fields are present, correctly typed, and contain valid data for compliance and forensic analysis purposes.
 *
 * Special attention is given to verifying the complete structure of the audit log including action type validation, target entity references, client metadata (IP address, user agent), and temporal consistency of timestamps.
 *
 * 1. Super administrator authentication: Creates new super admin account using authorize_super_admin_join utility.
 * 2. Audit log retrieval: Calls GET endpoint with valid audit log ID to retrieve complete record.
 * 3. Complete field validation: Uses typia.assert() for complete type validation of all fields.
 * 4. Business logic validation: Verifies action_type is valid, target_model is non-empty, request_body is valid JSON if present, response_status is in valid HTTP range, timestamps follow chronological order, and superAdmin email matches authenticated user.
 */
export async function test_api_super_admin_audit_log_complete_record_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
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
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const auditLog =
    await api.functional.shoppingMall.superAdmin.super_admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId,
      },
    );
  typia.assert(auditLog);
  // 3. Validate action_type is one of valid action types (business logic)
  const validActionTypes = [
    "USER_BAN",
    "USER_UNBAN",
    "SELLER_APPROVE",
    "SELLER_REJECT",
    "SELLER_SUSPEND",
    "SELLER_UNSUSPEND",
    "ADMIN_PROMOTE",
    "ADMIN_DEMOTE",
    "CATEGORY_CREATE",
    "CATEGORY_UPDATE",
    "CATEGORY_DELETE",
    "PRODUCT_DELETE",
    "ORDER_CANCEL",
    "ORDER_REFUND",
  ] as const;
  TestValidator.predicate("action_type is valid", () =>
    validActionTypes.includes(
      auditLog.action_type as (typeof validActionTypes)[number],
    ),
  );
  // 4. Validate target_model is non-empty string (business logic)
  TestValidator.predicate(
    "target_model is non-empty",
    () => auditLog.target_model.length > 0,
  );
  // 5. Validate request_body is valid JSON if present (business logic)
  if (auditLog.request_body !== null && auditLog.request_body !== undefined) {
    TestValidator.predicate("request_body is valid JSON", () => {
      try {
        JSON.parse(auditLog.request_body!);
        return true;
      } catch {
        return false;
      }
    });
  }
  // 6. Validate response_status is valid HTTP status code (business logic)
  TestValidator.predicate(
    "response_status is valid HTTP status",
    () => auditLog.response_status >= 100 && auditLog.response_status <= 599,
  );
  // 7. Validate chronological order of timestamps (business logic)
  TestValidator.predicate(
    "created_at <= updated_at",
    () =>
      new Date(auditLog.created_at).getTime() <=
      new Date(auditLog.updated_at).getTime(),
  );
  // 8. Validate superAdmin email matches authenticated user (business logic)
  TestValidator.equals(
    "superAdmin email matches authenticated user",
    auditLog.superAdmin.email,
    authResult.email,
  );
}
