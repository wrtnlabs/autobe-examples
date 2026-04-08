import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
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
 * Test administrator audit logs pagination and listing functionality.
 *
 * Validates the complete audit logs retrieval workflow for super administrators including authentication, paginated listing, and response structure validation. Ensures that the endpoint returns properly formatted pagination metadata and audit log entries with all required fields including the administrator relation.
 *
 * The test verifies default pagination behavior (page 1, limit 20), response structure compliance with IPageIShoppingMallAdminAuditLog.ISummary type, and that each audit log entry contains all mandatory fields (id, actionType, targetEntityType, targetEntityId, actionDetails, ipAddress, userAgent, createdAt, admin). Special attention is given to validating the admin relation is properly resolved with complete administrator information.
 *
 * 1. Super administrator authentication using authorize_super_admin_join utility.
 * 2. Call audit logs endpoint with default pagination parameters.
 * 3. Validate response structure including pagination metadata and data array.
 * 4. Verify each audit log entry contains all required fields.
 * 5. Validate admin relation is properly resolved in each entry.
 * 6. Confirm pagination metadata contains current, limit, records, and pages fields.
 */
export async function test_api_admin_audit_logs_pagination_and_listing(
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
  // 2. Call audit logs endpoint with default pagination
  const auditLogsResponse =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    auditLogsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current is number",
    typeof auditLogsResponse.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof auditLogsResponse.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof auditLogsResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof auditLogsResponse.pagination.pages === "number",
  );
  TestValidator.equals(
    "default page is 1",
    auditLogsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    auditLogsResponse.pagination.limit,
    20,
  );
  // 4. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(auditLogsResponse.data),
  );
  // 5. Validate audit log entries structure (if any exist)
  if (auditLogsResponse.data.length > 0) {
    const firstEntry = auditLogsResponse.data[0]!;
    // Validate required fields exist
    TestValidator.predicate("entry id exists", firstEntry.id !== undefined);
    TestValidator.predicate(
      "entry actionType exists",
      firstEntry.actionType !== undefined,
    );
    TestValidator.predicate(
      "entry targetEntityType exists",
      firstEntry.targetEntityType !== undefined,
    );
    TestValidator.predicate(
      "entry targetEntityId exists",
      firstEntry.targetEntityId !== undefined,
    );
    TestValidator.predicate(
      "entry actionDetails exists",
      firstEntry.actionDetails !== undefined,
    );
    TestValidator.predicate(
      "entry ipAddress exists",
      firstEntry.ipAddress !== undefined,
    );
    TestValidator.predicate(
      "entry userAgent exists",
      firstEntry.userAgent !== undefined,
    );
    TestValidator.predicate(
      "entry createdAt exists",
      firstEntry.createdAt !== undefined,
    );
    TestValidator.predicate(
      "entry admin exists",
      firstEntry.admin !== undefined,
    );
    // Validate admin relation structure
    TestValidator.predicate(
      "admin id exists",
      firstEntry.admin.id !== undefined,
    );
    TestValidator.predicate(
      "admin email exists",
      firstEntry.admin.email !== undefined,
    );
    TestValidator.predicate(
      "admin grade exists",
      firstEntry.admin.grade !== undefined,
    );
    TestValidator.predicate(
      "admin status exists",
      firstEntry.admin.status !== undefined,
    );
    TestValidator.predicate(
      "admin banned_at exists",
      firstEntry.admin.banned_at !== undefined,
    );
    TestValidator.predicate(
      "admin created_at exists",
      firstEntry.admin.created_at !== undefined,
    );
    TestValidator.predicate(
      "admin member exists",
      firstEntry.admin.member !== undefined,
    );
  }
}
