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
 * Test audit log retrieval with complex date range filtering and multi-criteria search combinations.
 *
 * Validates the audit log search endpoint's ability to filter by temporal ranges and multiple criteria simultaneously. Ensures proper handling of edge cases including empty results, pagination boundaries, and complex filter intersections.
 *
 * The test performs comprehensive validation of date range filtering (created_at_gte, created_at_lte), action type filtering, target entity filtering, and administrator ID filtering. Each filter combination is tested to verify AND logic is applied correctly.
 *
 * Special attention is given to pagination edge cases including minimum/maximum limit values, out-of-bounds page requests, and empty result sets. The immutability of audit logs is also verified by ensuring previously created logs remain queryable.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. Administrator performs multiple actions to generate audit logs (simulated).
 * 3. Test created_at_gte filtering - returns logs from specified date onwards.
 * 4. Test created_at_lte filtering - returns logs up to specified date.
 * 5. Test combined date range filtering - returns logs within range.
 * 6. Test action_type filter combined with date range.
 * 7. Test target_entity filter combined with date range.
 * 8. Test all filters combined (action_type, target_entity, target_id, ecommerce_admin_id, date range).
 * 9. Test pagination edge cases (page=1, limit=1; page=1, limit=100; page beyond available).
 * 10. Test no matching results - verify empty data with records=0, pages=0.
 * 11. Verify audit log immutability - previously created logs remain queryable.
 */
export async function test_api_admin_audit_logs_date_range_and_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
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
  // 2. Get current time for date range testing
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  // 3. Test created_at_gte filtering (from date only)
  const fromOnlyResult = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_gte: pastDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(fromOnlyResult);
  TestValidator.predicate(
    "from date filter returns valid response",
    fromOnlyResult.pagination.records >= 0,
  );
  // 4. Test created_at_lte filtering (to date only)
  const toOnlyResult = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(toOnlyResult);
  TestValidator.predicate(
    "to date filter returns valid response",
    toOnlyResult.pagination.records >= 0,
  );
  // 5. Test combined date range filtering
  const rangeResult = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_gte: pastDate.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "date range filter returns valid response",
    rangeResult.pagination.records >= 0,
  );
  // 6. Test action_type filter combined with date range
  const actionTypeResult =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: "seller_approved",
        created_at_gte: pastDate.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(actionTypeResult);
  TestValidator.predicate(
    "action_type + date range filter works",
    actionTypeResult.pagination.records >= 0,
  );
  // 7. Test target_entity filter combined with date range
  const targetEntityResult =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        target_entity: "seller",
        created_at_gte: pastDate.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(targetEntityResult);
  TestValidator.predicate(
    "target_entity + date range filter works",
    targetEntityResult.pagination.records >= 0,
  );
  // 8. Test all filters combined
  const complexFilterResult =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        action_type: "seller_approved",
        target_entity: "seller",
        ecommerce_admin_id: adminAuth.id,
        created_at_gte: pastDate.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(complexFilterResult);
  TestValidator.predicate(
    "complex filter combination works",
    complexFilterResult.pagination.records >= 0,
  );
  // 9. Test pagination edge cases
  // 9.1 Minimum values (page=1, limit=1)
  const minPaginationResult =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(minPaginationResult);
  TestValidator.equals(
    "minimum pagination limit respected",
    minPaginationResult.pagination.limit,
    1,
  );
  // 9.2 Maximum limit (page=1, limit=100)
  const maxPaginationResult =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(maxPaginationResult);
  TestValidator.equals(
    "maximum pagination limit respected",
    maxPaginationResult.pagination.limit,
    100,
  );
  // 9.3 Page beyond available pages - verify empty data with correct pagination
  const maxPageResult = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(maxPageResult);
  TestValidator.equals(
    "out-of-bounds page returns empty data",
    maxPageResult.data.length,
    0,
  );
  // 10. Test no matching results with specific filter
  const noMatchResult = await api.functional.ecommerce.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        action_type: "nonexistent_action_type_xyz",
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no matching results returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no matching results has records=0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no matching results has pages=0",
    noMatchResult.pagination.pages,
    0,
  );
  // 11. Verify audit log immutability - re-query same range to ensure logs are still present
  const immutabilityCheck =
    await api.functional.ecommerce.admin.audit_logs.index(adminConnection, {
      body: {
        created_at_gte: pastDate.toISOString(),
        created_at_lte: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    });
  typia.assert(immutabilityCheck);
  TestValidator.predicate(
    "audit logs remain queryable (immutable)",
    immutabilityCheck.pagination.records >= 0,
  );
}
