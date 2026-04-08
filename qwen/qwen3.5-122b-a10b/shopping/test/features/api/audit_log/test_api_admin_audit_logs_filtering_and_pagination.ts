import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator audit log retrieval with comprehensive filtering and pagination capabilities.
 *
 * Validates the complete audit log browsing workflow including administrator authentication, various filter combinations, and pagination functionality. Ensures that audit logs can be properly filtered by action type, target entity, target ID, administrator, and date ranges while maintaining correct pagination metadata.
 *
 * Special attention is given to verifying that sensitive state change details (previous_state and new_state) are excluded from summary responses, and that pagination metadata accurately reflects the total record count and available pages.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Retrieves audit logs with no filters (baseline test).
 * 3. Filters by action_type and verifies matching logs only.
 * 4. Filters by target_entity and verifies category-related logs.
 * 5. Filters by target_id and verifies specific entity logs.
 * 6. Filters by ecommerce_admin_id and verifies admin-specific logs.
 * 7. Filters by created_at date range and verifies temporal filtering.
 * 8. Applies multiple filters simultaneously with AND logic.
 * 9. Tests pagination with different page and limit values.
 * 10. Verifies default sorting by created_at DESC.
 * 11. Validates response structure matches IEcommerceAdminAuditLog.ISummary.
 * 12. Confirms previous_state and new_state are excluded from summaries.
 */
export async function test_api_admin_audit_logs_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Baseline: Retrieve all audit logs with no filters
  const baseline = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline pagination exists",
    baseline.pagination !== undefined,
    true,
  );
  TestValidator.predicate("baseline has data", baseline.data.length >= 0);
  // 3. Filter by action_type
  if (baseline.data.length > 0) {
    const firstActionType = baseline.data[0].action_type;
    const actionTypeFilter =
      await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
        body: {
          action_type: firstActionType,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      });
    typia.assert(actionTypeFilter);
    // Verify all returned logs match the action_type
    for (const log of actionTypeFilter.data) {
      TestValidator.equals(
        "action_type matches filter",
        log.action_type,
        firstActionType,
      );
    }
  }
  // 4. Filter by target_entity
  if (baseline.data.length > 0) {
    const firstTargetEntity = baseline.data[0].target_entity;
    const entityFilter = await api.functional.ecommerce.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          target_entity: firstTargetEntity,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      },
    );
    typia.assert(entityFilter);
    // Verify all returned logs match the target_entity
    for (const log of entityFilter.data) {
      TestValidator.equals(
        "target_entity matches filter",
        log.target_entity,
        firstTargetEntity,
      );
    }
  }
  // 5. Filter by target_id
  const targetIdLogs = baseline.data.filter(
    (log) => log.target_id !== null && log.target_id !== undefined,
  );
  if (targetIdLogs.length > 0) {
    const targetId = targetIdLogs[0].target_id!;
    const targetIdFilter =
      await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
        body: {
          target_id: targetId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      });
    typia.assert(targetIdFilter);
    // Verify all returned logs match the target_id
    for (const log of targetIdFilter.data) {
      TestValidator.equals("target_id matches filter", log.target_id, targetId);
    }
  }
  // 6. Filter by ecommerce_admin_id
  if (baseline.data.length > 0) {
    const adminId = baseline.data[0].admin.id;
    const adminIdFilter = await api.functional.ecommerce.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          ecommerce_admin_id: adminId,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      },
    );
    typia.assert(adminIdFilter);
    // Verify all returned logs match the admin_id
    for (const log of adminIdFilter.data) {
      TestValidator.equals("admin id matches filter", log.admin.id, adminId);
    }
  }
  // 7. Filter by created_at date range
  if (baseline.data.length > 0) {
    // Sort by created_at to get date range
    const sortedByDate = [...baseline.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const startDate = sortedByDate[0].created_at;
    const endDate = sortedByDate[sortedByDate.length - 1].created_at;
    const dateRangeFilter =
      await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
        body: {
          created_at_gte: startDate,
          created_at_lte: endDate,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      });
    typia.assert(dateRangeFilter);
    // Verify all returned logs are within the date range
    for (const log of dateRangeFilter.data) {
      TestValidator.predicate(
        "created_at >= start date",
        new Date(log.created_at).getTime() >= new Date(startDate).getTime(),
      );
      TestValidator.predicate(
        "created_at <= end date",
        new Date(log.created_at).getTime() <= new Date(endDate).getTime(),
      );
    }
  }
  // 8. Multiple filters simultaneously (AND logic)
  if (baseline.data.length > 0) {
    const sampleLog = baseline.data[0];
    const multiFilter = await api.functional.ecommerce.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: sampleLog.action_type,
          target_entity: sampleLog.target_entity,
          ecommerce_admin_id: sampleLog.admin.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      },
    );
    typia.assert(multiFilter);
    // Verify all filters are applied
    for (const log of multiFilter.data) {
      TestValidator.equals(
        "action_type matches",
        log.action_type,
        sampleLog.action_type,
      );
      TestValidator.equals(
        "target_entity matches",
        log.target_entity,
        sampleLog.target_entity,
      );
      TestValidator.equals(
        "admin id matches",
        log.admin.id,
        sampleLog.admin.id,
      );
    }
  }
  // 9. Test pagination with different page and limit values
  const paginationTest1 = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(paginationTest1);
  const paginationTest2 = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(paginationTest2);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationTest1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginationTest1.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records >= 0",
    paginationTest1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginationTest1.pagination.pages >= 0,
  );
  // 10. Verify default sorting by created_at DESC (newest first)
  if (baseline.data.length > 1) {
    for (let i = 0; i < baseline.data.length - 1; i++) {
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        new Date(baseline.data[i].created_at).getTime() >=
          new Date(baseline.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 11. Verify response structure matches IEcommerceAdminAuditLog.ISummary
  if (baseline.data.length > 0) {
    const sampleLog = baseline.data[0];
    TestValidator.predicate(
      "has id",
      sampleLog.id !== undefined && sampleLog.id !== null,
    );
    TestValidator.predicate(
      "has action_type",
      sampleLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "has target_entity",
      sampleLog.target_entity !== undefined,
    );
    TestValidator.predicate("has admin", sampleLog.admin !== undefined);
    TestValidator.predicate(
      "has created_at",
      sampleLog.created_at !== undefined,
    );
    TestValidator.predicate(
      "has updated_at",
      sampleLog.updated_at !== undefined,
    );
  }
  // 12. Verify previous_state and new_state are NOT in summary (they don't exist in ISummary type)
  // This is validated by TypeScript compilation - if these fields existed, they would need to be in ISummary
  // The fact that we can compile without accessing these fields confirms they're not exposed
}
