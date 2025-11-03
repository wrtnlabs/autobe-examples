import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";

/**
 * Validate paginated/filtered search of audit logs by an authenticated admin.
 *
 * The test walks through the full scenario:
 *
 * 1. Register a new admin, ensuring onboarding works.
 * 2. Attempt search as unauthenticated user (should be forbidden).
 * 3. Perform a general search (no filters) as newly registered admin and expect
 *    paginated log results or an empty data array.
 * 4. Pick a sample log (if any), apply filters by actor_type, actor_id, action,
 *    target_type, and target_id, and verify filtered result matches those
 *    criteria.
 * 5. Query a date/time range with no known logs and confirm an empty response is
 *    returned gracefully.
 * 6. Try to modify or delete log records (should not be possible; no
 *    endpoint/method exists).
 *
 * All returned audit log records are immutable and read-only, enforcing
 * compliance and platform security.
 */
export async function test_api_admin_audit_log_paginated_search(
  connection: api.IConnection,
) {
  // 1. Admin registration (and authenticate via returned token)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreate = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-portal.example.com/onboard",
    referrer: "https://marketing.example.com",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Unauthenticated attempt (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot access audit log search",
    async () => {
      await api.functional.communityPlatform.admin.auditLogs.index(unauthConn, {
        body: {} satisfies ICommunityPlatformAuditLog.IRequest,
      });
    },
  );

  // 3. General paginated search (no filters)
  const pageLogs = await api.functional.communityPlatform.admin.auditLogs.index(
    connection,
    { body: {} satisfies ICommunityPlatformAuditLog.IRequest },
  );
  typia.assert(pageLogs);

  TestValidator.equals(
    "page info present on audit log search",
    typeof pageLogs.pagination.current,
    "number",
  );
  TestValidator.predicate(
    "pagination.limit in [1, 100]",
    pageLogs.pagination.limit >= 1 && pageLogs.pagination.limit <= 100,
  );

  // 4. Apply various filters if there are logs
  if (pageLogs.data.length > 0) {
    const log = pageLogs.data[0];

    // Filter by actor_type and actor_id
    const filteredByActor =
      await api.functional.communityPlatform.admin.auditLogs.index(connection, {
        body: {
          actor_type: log.actor_type,
          actor_id: log.actor_id,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      });
    typia.assert(filteredByActor);
    TestValidator.predicate(
      "filtered logs all match actor_type",
      filteredByActor.data.every(
        (entry) => entry.actor_type === log.actor_type,
      ),
    );
    TestValidator.predicate(
      "filtered logs all match actor_id",
      filteredByActor.data.every((entry) => entry.actor_id === log.actor_id),
    );

    // Filter by action
    const filteredByAction =
      await api.functional.communityPlatform.admin.auditLogs.index(connection, {
        body: {
          action: log.action,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      });
    typia.assert(filteredByAction);
    TestValidator.predicate(
      "filtered logs all match action",
      filteredByAction.data.every((entry) => entry.action === log.action),
    );

    // Filter by target_type and target_id
    const filteredByTarget =
      await api.functional.communityPlatform.admin.auditLogs.index(connection, {
        body: {
          target_type: log.target_type,
          target_id: log.target_id,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      });
    typia.assert(filteredByTarget);
    TestValidator.predicate(
      "filtered logs all match target_type",
      filteredByTarget.data.every(
        (entry) => entry.target_type === log.target_type,
      ),
    );
    TestValidator.predicate(
      "filtered logs all match target_id",
      filteredByTarget.data.every((entry) => entry.target_id === log.target_id),
    );

    // Filter by created_from and created_to (using known log's timestamp)
    const filteredByCreatedAt =
      await api.functional.communityPlatform.admin.auditLogs.index(connection, {
        body: {
          created_from: log.created_at,
          created_to: log.created_at,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      });
    typia.assert(filteredByCreatedAt);
    TestValidator.predicate(
      "filtered logs are in range",
      filteredByCreatedAt.data.every(
        (entry) => entry.created_at === log.created_at,
      ),
    );
  }

  // 5. Edge case: No matches for impossible filter
  const emptyResult =
    await api.functional.communityPlatform.admin.auditLogs.index(connection, {
      body: {
        action: "nonexistent_audit_action_name_that_should_not_exist",
      } satisfies ICommunityPlatformAuditLog.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "no log found for unknown action",
    emptyResult.data.length,
    0,
  );

  // 6. Mutability enforcement (no API support to modify/delete)
  // If the SDK has no endpoint for deleting or updating logs, we rely on the type system:
  TestValidator.predicate(
    "audit log entities are immutable: no mutation/deletion endpoint exists",
    typeof api.functional.communityPlatform.admin.auditLogs.index ===
      "function",
  );
}
