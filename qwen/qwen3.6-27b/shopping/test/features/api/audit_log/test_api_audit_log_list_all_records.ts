import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test listing all administrative audit log records with default pagination behavior.
 *
 * Validates the complete audit log retrieval workflow as an authenticated administrator. Submits a PATCH search request with empty filters to retrieve the full audit trail without any filtering constraints, confirming the system returns records sorted by creation timestamp in descending order.
 *
 * Each audit log record is verified to contain essential compliance fields: unique identifier, target entity type, action performed, target entity identifier, creation timestamp, and administrator identity information. Pagination metadata is confirmed to reflect accurate current page, limit, total record count, and total pages.
 *
 * 1. Administrator registers to gain platform access credentials.
 * 2. Administrator submits audit log search request with empty filters to get all records.
 * 3. Validates paginated response structure contains audit log summary data.
 * 4. Verifies pagination metadata shows correct default values and computed totals.
 * 5. Confirms each audit log record contains required identity and action fields.
 */
export async function test_api_audit_log_list_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Submit audit log search request with empty filters to retrieve all records
  const body = {} satisfies IEcommercePlatformAdminAuditLog.IRequest;
  const response =
    await api.functional.ecommercePlatform.admin.audit_logs.index(
      adminConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate pagination metadata with default values
  TestValidator.equals(
    "current page defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages matches formula",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate paginated data array
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // 5. Validate each audit log record structure if data exists
  await ArrayUtil.asyncForEach(response.data, async (record) => {
    typia.assert(record);
    // Validate record contains required fields
    TestValidator.predicate("record has non-empty id", record.id.length > 0);
    TestValidator.predicate(
      "record has non-empty target_type",
      record.target_type.length > 0,
    );
    TestValidator.predicate(
      "record has non-empty action",
      record.action.length > 0,
    );
    TestValidator.predicate(
      "record has non-empty target_id",
      record.target_id.length > 0,
    );
    TestValidator.predicate(
      "record has valid created_at",
      record.created_at.length > 0,
    );
    // Validate admin identity is embedded
    typia.assert(record.admin);
    TestValidator.predicate(
      "admin has non-empty id",
      record.admin.id.length > 0,
    );
    TestValidator.predicate(
      "admin created_at is valid",
      record.admin.created_at.length > 0,
    );
    TestValidator.predicate(
      "admin updated_at is valid",
      record.admin.updated_at.length > 0,
    );
  });
}
