import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate that admin audit logs can be filtered by affected entity and time
 * range.
 *
 * Business context:
 *
 * - Admins must be able to perform forensic investigations on configuration
 *   changes.
 * - When an admin creates an admin permission, an audit log entry should be
 *   recorded.
 * - Investigators need to search by entity_type/entity_id and by created_at
 *   window.
 *
 * Scenario steps:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. As that admin, create a new admin permission via POST
 *    /shoppingMall/admin/adminPermissions.
 * 3. Capture timestamps before and after the permission creation and the
 *    permission.id.
 * 4. Query PATCH /shoppingMall/admin/adminAuditLogs with an
 *    IShoppingMallAdminAuditLog.IRequest body that filters by entity_type
 *    (using a plausible value like "admin_permission") and a
 *    from_created_at/to_created_at window surrounding the time of permission
 *    creation.
 * 5. Assert that at least one audit log entry matches the expected entity_type
 *    and, when entity_id is populated, matches the created permission.id and
 *    has created_at within the given time range.
 * 6. Run a negative search using an impossible entity_id (another random UUID)
 *    within the same time range and assert that no result has that fake
 *    entity_id (and optionally that data is empty or does not contain any such
 *    entry).
 */
export async function test_api_admin_audit_logs_search_by_entity_and_time_range(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);

  // 2. Create an admin permission that should generate an audit log entry
  const beforePermissionCreated: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const permissionBody = {
    code: `perm.${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "configuration",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  typia.assert(permission);

  const afterPermissionCreated: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // 3. Build a search window and filter by entity type and entity id
  const entityType = "admin_permission";

  const searchRequest = {
    entity_type: entityType,
    entity_id: permission.id,
    from_created_at: beforePermissionCreated,
    to_created_at: afterPermissionCreated,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const page: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: searchRequest,
    });
  typia.assert(page);

  const { data } = page;
  TestValidator.predicate(
    "audit log search returns at least one entry for the created permission within time range",
    data.length > 0,
  );

  // 4. Validate that at least one entry matches entity_type, entity_id and created_at window
  const matching = data.filter((log) => {
    if (log.entity_type !== entityType) return false;
    if (log.entity_id == null) return false;
    if (log.entity_id !== permission.id) return false;
    const createdAt = log.created_at;
    return (
      createdAt >= beforePermissionCreated &&
      createdAt <= afterPermissionCreated
    );
  });

  TestValidator.predicate(
    "at least one audit log entry matches entity type, entity id and created_at window",
    matching.length > 0,
  );

  // 5. Negative scenario: search using a random, non-existent entity_id
  const fakeEntityId = typia.random<string & tags.Format<"uuid">>();

  const negativeSearchRequest = {
    entity_type: entityType,
    entity_id: fakeEntityId,
    from_created_at: beforePermissionCreated,
    to_created_at: afterPermissionCreated,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const negativePage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: negativeSearchRequest,
    });
  typia.assert(negativePage);

  const negativeData = negativePage.data;
  const hasFakeEntity = negativeData.some(
    (log) => log.entity_id === fakeEntityId,
  );

  TestValidator.predicate(
    "no audit log entry is returned for a non-existent entity_id in the same time window",
    hasFakeEntity === false,
  );
}
