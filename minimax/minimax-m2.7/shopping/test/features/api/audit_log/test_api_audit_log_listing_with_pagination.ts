import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving administrative audit logs with pagination.
 *
 * Validates the complete audit log listing functionality for administrators. This test ensures that authenticated administrators can successfully query the audit trail with proper pagination metadata. The test covers both default pagination behavior and explicit pagination parameter handling.
 *
 * The test creates an administrator who performs actions (such as joining), then retrieves and validates the paginated audit log response. It verifies that pagination metadata is accurate and that each audit log entry contains all required fields including the admin reference.
 *
 * 1. First administrator joins and authenticates successfully (creates audit log entry).
 * 2. Retrieves audit logs with default pagination (page 1, default limit).
 * 3. Validates pagination metadata: current=1, records >= 1, pages >= 1, limit is valid.
 * 4. Validates each audit log entry contains: id (UUID), action, resourceType, resourceId, ipAddress, createdAt, admin object with id and email.
 * 5. Tests pagination by requesting page 2 with limit 10.
 * 6. Validates second page response structure matches pagination schema.
 */
export async function test_api_audit_log_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator (creates audit log entry)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve audit logs with default pagination (empty body = page 1, default limit)
  const firstPage =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(firstPage);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate("records >= 1", firstPage.pagination.records >= 1);
  TestValidator.predicate("pages >= 1", firstPage.pagination.pages >= 1);
  TestValidator.predicate("limit is valid", firstPage.pagination.limit >= 1);
  // 4. Validate audit log entry structure
  for (const log of firstPage.data) {
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(log.id),
    );
    TestValidator.predicate("action is string", typeof log.action === "string");
    TestValidator.predicate(
      "resourceType is string",
      typeof log.resourceType === "string",
    );
    TestValidator.predicate(
      "resourceId is valid UUID",
      /^[0-9a-f-]{36}$/i.test(log.resourceId),
    );
    TestValidator.predicate(
      "ipAddress is string",
      typeof log.ipAddress === "string",
    );
    TestValidator.predicate(
      "createdAt is valid date-time",
      !isNaN(Date.parse(log.createdAt)),
    );
    TestValidator.predicate("admin object exists", log.admin !== undefined);
    TestValidator.predicate(
      "admin.id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(log.admin.id),
    );
    TestValidator.predicate(
      "admin.email is string",
      typeof log.admin.email === "string",
    );
  }
  // 5. Test pagination with page 2 and limit 10
  const secondPage =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(secondPage);
  // 6. Validate second page pagination metadata
  TestValidator.equals(
    "second page current is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("limit is 10", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "total records match",
    secondPage.pagination.records === firstPage.pagination.records,
  );
}
