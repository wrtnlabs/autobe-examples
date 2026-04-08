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
 * Test adding a new metadata entry to an existing super admin audit log.
 *
 * Validates the metadata upsert operation for super administrator audit logs.
 * This test verifies that a super administrator can successfully add a new metadata
 * entry to an existing audit log record, and that the response correctly contains
 * pagination metadata along with the newly created metadata entry.
 *
 * The test flow involves:
 * 1. Authenticating as a super administrator
 * 2. Creating another super admin account (which generates an audit log internally)
 * 3. Adding a new metadata entry with key 'reason' and a descriptive value
 * 4. Verifying the response structure and data integrity
 *
 * 1. Register and authenticate as a super administrator.
 * 2. Register another super admin to create an audit log entry.
 * 3. Call PATCH endpoint with metadata entry containing 'reason' key.
 * 4. Validate response has pagination and data array with the new entry.
 * 5. Verify the metadata entry has correct key-value pair and created_at.
 */
export async function test_api_super_admin_audit_log_metadata_add_new_entry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!}!`,
      href: "https://example.com/super-admin",
      referrer: "https://example.com/",
    },
  });
  typia.assert(superAdmin);
  // 2. Register another super admin account (this action generates an audit log internally)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetSuperAdmin = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!}!`,
      href: "https://example.com/super-admin",
      referrer: "https://example.com/",
    },
  });
  typia.assert(targetSuperAdmin);
  // 3. Use the target's ID as the audit log reference
  // Note: In the actual system, audit logs are created server-side for authentication events
  // The target account's ID serves as our test audit log identifier
  const testLogId = targetSuperAdmin.id;
  // 4. Call PATCH endpoint with metadata entry containing 'reason' key
  const metadataResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.audit_logs.metadata.upsert(
      superAdminConnection,
      {
        logId: testLogId,
        body: {
          reason: "Test metadata entry for audit log validation",
        } satisfies IEcommerceMallSuperAdminAuditLogMetadatum.IRequest,
      },
    );
  typia.assert(metadataResponse);
  // 5. Validate response has pagination metadata
  TestValidator.equals(
    "response has pagination metadata",
    metadataResponse.pagination !== null &&
      metadataResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has current page",
    metadataResponse.pagination.current !== null &&
      metadataResponse.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    metadataResponse.pagination.limit !== null &&
      metadataResponse.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    metadataResponse.pagination.records !== null &&
      metadataResponse.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    metadataResponse.pagination.pages !== null &&
      metadataResponse.pagination.pages !== undefined,
    true,
  );
  // 6. Validate response has data array
  TestValidator.equals(
    "response has data array",
    Array.isArray(metadataResponse.data),
    true,
  );
  TestValidator.predicate(
    "data array has at least one entry",
    metadataResponse.data.length > 0,
  );
  // 7. Find and validate the newly created metadata entry
  const reasonEntry = metadataResponse.data.find(
    (entry) => entry.key === "reason",
  );
  TestValidator.notEquals(
    "metadata entry with key 'reason' exists",
    reasonEntry,
    null,
  );
  // 8. Validate the metadata entry has correct key-value pair
  if (reasonEntry) {
    TestValidator.equals(
      "metadata entry has correct key",
      reasonEntry.key,
      "reason",
    );
    TestValidator.equals(
      "metadata entry has correct value",
      reasonEntry.value,
      "Test metadata entry for audit log validation",
    );
    // 9. Verify created_at timestamp is present
    TestValidator.equals(
      "metadata entry has created_at timestamp",
      reasonEntry.created_at !== null && reasonEntry.created_at !== undefined,
      true,
    );
    // Validate the timestamp format is ISO 8601
    TestValidator.predicate(
      "created_at is valid ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(reasonEntry.created_at),
    );
  }
}
