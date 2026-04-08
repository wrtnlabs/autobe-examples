import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminAuditLogMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test upserting metadata for a non-existent audit log returns appropriate error.
 *
 * Validates that attempting to add metadata entries to an audit log that does not
 * exist returns HTTP 404 Not Found. This test ensures system integrity by preventing
 * orphaned metadata entries and maintaining proper audit trail boundaries.
 *
 * **Pre-conditions**: Super administrator must be authenticated with valid JWT tokens
 * to access the audit log metadata endpoint.
 *
 * **Test Flow**:
 * 1. Authenticate as a super administrator using /auth/superAdmin/join
 * 2. Generate a random UUID that does not correspond to any existing audit log
 * 3. Call PATCH /superAdmin/super-admin/audit-logs/{logId}/metadata with the non-existent UUID
 * 4. Verify the response returns HTTP 404 Not Found
 * 5. Confirm the error indicates the audit log was not found
 *
 * **Expected Results**:
 * - System rejects the request with 404 status
 * - Error message clearly indicates audit log not found
 * - No metadata entries are created for non-existent audit logs
 * - Audit trail integrity is maintained (no orphaned metadata)
 */
export async function test_api_super_admin_audit_log_metadata_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that does not correspond to any existing audit log
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to upsert metadata for non-existent audit log
  // 4. & 5. Verify 404 Not Found error is returned
  await TestValidator.httpError(
    "upserting metadata for non-existent audit log returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.upsert(
        superAdminConnection,
        {
          logId: nonExistentLogId,
          body: {
            reason: "test metadata",
            target_entity_type: "test_entity",
          } satisfies IEcommerceMallSuperAdminAuditLogMetadatum.IRequest,
        },
      ),
  );
}
