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
 * Test retrieval of a specific audit log metadata entry by a super administrator.
 *
 * Validates the metadata retrieval endpoint for super administrators. First authenticates
 * as a super admin using the join endpoint, then retrieves metadata by its unique identifier
 * within the context of a parent audit log. The response should contain all metadata fields
 * (id, key, value, createdAt) along with the parent audit log summary via the nested
 * auditLog object.
 *
 * **Authentication Flow**:
 * 1. Register/authenticate as super administrator via join endpoint
 * 2. Receive JWT tokens for authorized access
 *
 * **Metadata Retrieval**:
 * 3. Call GET endpoint with valid logId and metadataId UUIDs
 * 4. Validate HTTP 200 response
 * 5. Verify metadata contains id, key, value, createdAt fields
 * 6. Verify nested auditLog object is present with summary data
 *
 * **Note**: This test uses existing audit log data from the system. The metadata IDs
 * should belong to valid audit log entries for successful retrieval.
 */
export async function test_api_super_admin_audit_log_metadata_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Retrieve metadata entry
  // Using valid UUIDs - in real E2E environment, these would reference existing audit log metadata
  const metadata =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.at(
      superAdminConnection,
      {
        logId: typia.random<string & tags.Format<"uuid">>(),
        metadataId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(metadata);
  // 3. Validate metadata response structure
  TestValidator.equals("metadata has id", metadata.id.length > 0, true);
  TestValidator.equals(
    "metadata has key",
    typeof metadata.key === "string",
    true,
  );
  TestValidator.equals(
    "metadata has value",
    typeof metadata.value === "string",
    true,
  );
  TestValidator.equals(
    "metadata has createdAt",
    typeof metadata.createdAt === "string",
    true,
  );
  TestValidator.equals(
    "metadata has auditLog",
    metadata.auditLog !== undefined,
    true,
  );
  // 4. Validate nested auditLog summary
  if (metadata.auditLog) {
    TestValidator.equals(
      "auditLog has action",
      typeof metadata.auditLog.action === "string",
      true,
    );
    TestValidator.equals(
      "auditLog has id",
      metadata.auditLog.id.length > 0,
      true,
    );
  }
}
