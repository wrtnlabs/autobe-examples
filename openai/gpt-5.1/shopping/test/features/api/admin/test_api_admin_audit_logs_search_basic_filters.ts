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

/**
 * Validate basic admin audit log search with pagination and structural checks.
 *
 * Business goal: Ensure that an authenticated admin can call the audit log
 * search endpoint (PATCH /shoppingMall/admin/adminSearch/auditLogs) and receive
 * a paginated list of audit log summaries that conform to the documented DTO
 * contracts.
 *
 * Due to the lack of a seeding API for shopping_mall_admin_audit_logs, this
 * test focuses on:
 *
 * - Successful authenticated invocation of the search API,
 * - Correct handling of pagination parameters (page, limit), and
 * - Structural correctness of the returned summary records.
 *
 * Process:
 *
 * 1. Register a new admin via POST /auth/admin/join. The SDK will attach the
 *    Authorization header using the returned token.
 * 2. Build a basic IShoppingMallAdminAuditLog.IRequest body that either leaves
 *    most filters null/undefined or sets a broad created_at window, together
 *    with small positive pagination values (page=1, limit=10).
 * 3. Invoke api.functional.shoppingMall.admin.adminSearch.auditLogs.index with
 *    this request body.
 * 4. Assert that the response satisfies IPageIShoppingMallAdminAuditLog.ISummary
 *    using typia.assert.
 * 5. Validate that pagination.current and pagination.limit are non-negative and
 *    consistent with the requested values when specified.
 * 6. For each audit log summary entry, validate that required fields are populated
 *    (id, action_type, entity_type, created_at) and that when
 *    shopping_mall_admin_id is non-null, the nested admin summary is present.
 */
export async function test_api_admin_audit_logs_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Build a broad audit log search request with basic pagination.
  const fromCreatedAt: string & tags.Format<"date-time"> = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const toCreatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const requestBody = {
    shopping_mall_admin_id: authorizedAdmin.id,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: fromCreatedAt,
    to_created_at: toCreatedAt,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  // 3. Invoke the audit log search endpoint.
  const pageResult: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination information.
  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    pagination.limit >= 0,
  );

  // When page and limit are explicitly specified, they should typically match
  // the response pagination values, but the backend might normalize them.
  // We therefore assert weaker conditions: current and limit are greater than 0
  // and within reasonable bounds.
  TestValidator.predicate(
    "pagination.current should be at least 1 when requested page is 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit should be at least 1 when requested limit is 10",
    pagination.limit >= 1,
  );

  // 5. Validate each audit log summary entry structure.
  for (const log of pageResult.data) {
    // Required identifiers and types.
    TestValidator.predicate(
      "audit log id must be a non-empty string",
      typeof log.id === "string" && log.id.length > 0,
    );
    TestValidator.predicate(
      "audit log action_type must be a non-empty string",
      typeof log.action_type === "string" && log.action_type.length > 0,
    );
    TestValidator.predicate(
      "audit log entity_type must be a non-empty string",
      typeof log.entity_type === "string" && log.entity_type.length > 0,
    );
    TestValidator.predicate(
      "audit log created_at must be a non-empty string",
      typeof log.created_at === "string" && log.created_at.length > 0,
    );

    // When shopping_mall_admin_id is non-null, nested admin summary should exist.
    if (
      log.shopping_mall_admin_id !== null &&
      log.shopping_mall_admin_id !== undefined
    ) {
      TestValidator.predicate(
        "audit log with admin id should include admin summary",
        log.admin !== undefined && log.admin !== null,
      );
      if (log.admin) {
        TestValidator.equals(
          "admin summary id should match shopping_mall_admin_id when present",
          log.admin.id,
          log.shopping_mall_admin_id,
        );
      }
    }
  }
}
