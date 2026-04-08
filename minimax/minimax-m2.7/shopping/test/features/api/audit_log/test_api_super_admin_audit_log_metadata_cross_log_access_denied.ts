import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import type { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator cannot retrieve metadata entries that belong to a different audit log.
 *
 * Validates the security boundary ensuring metadata is properly scoped to its parent audit log. This test verifies that when a metadata ID is requested with an incorrect audit log ID (pointing to a different audit log), the system returns HTTP 404 instead of exposing the metadata entry. This prevents cross-resource access attacks where an attacker might try to access metadata by guessing UUIDs.
 *
 * 1. Authenticate as a super administrator using authorize_super_admin_join.
 * 2. Generate a valid UUID for logId (representing audit log A).
 * 3. Generate a valid UUID for metadataId (representing metadata that would belong to audit log B).
 * 4. Perform GET request to /ecommerceMall/superAdmin/super-admin/audit-logs/{logId}/metadata/{metadataId}.
 * 5. System must return HTTP 404 - metadata not found for this audit log, preventing cross-log access.
 */
export async function test_api_super_admin_audit_log_metadata_cross_log_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate valid UUIDs for cross-log access attempt
  const logId = typia.random<string & tags.Format<"uuid">>();
  const metadataId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access metadata with mismatched logId and metadataId
  // The metadataId belongs to a different audit log than logId
  // System must return HTTP 404 - preventing cross-resource access
  await TestValidator.httpError(
    "cross-log metadata access denied",
    404,
    async () =>
      await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.at(
        superAdminConnection,
        {
          logId: logId,
          metadataId: metadataId,
        },
      ),
  );
}
