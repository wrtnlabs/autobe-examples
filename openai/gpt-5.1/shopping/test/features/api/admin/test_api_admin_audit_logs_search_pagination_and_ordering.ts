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
 * Validate pagination and default ordering for admin audit log searches.
 *
 * Business context: Admins use /shoppingMall/admin/adminSearch/auditLogs to
 * inspect an append-only audit trail of administrative actions. The endpoint is
 * paginated and is expected to return results ordered by created_at in
 * descending order (newest first). This test focuses on verifying that
 * pagination metadata is consistent with the returned data, that page/limit are
 * respected, and that ordering by created_at is monotonic descending per page.
 *
 * High-level steps:
 *
 * 1. Join (register) a new admin using POST /auth/admin/join. The SDK will
 *    automatically attach the returned access token to the connection, so
 *    subsequent calls to admin-only endpoints are authenticated.
 * 2. Search admin audit logs using PATCH /shoppingMall/admin/adminSearch/auditLogs
 *    filtered by the new admin's id, with page=1 and limit=10.
 * 3. Validate that:
 *
 *    - Pagination.current is 1 and pagination.limit is 10.
 *    - Pagination.records and pagination.pages are >= 0.
 *    - Pages is consistent with records and limit (pages === 0 iff records === 0,
 *         else pages === ceil(records/limit)).
 *    - Data.length <= limit and, when records > 0, data.length > 0.
 *    - When there are at least two records in data, they are ordered by created_at
 *         descending (i.e., data[i].created_at >= data[i+1].created_at when
 *         interpreted as ISO timestamps).
 * 4. If there are at least two pages (pagination.pages >= 2), request page=2 and
 *    verify:
 *
 *    - Pagination.current === 2 and pagination.limit === 10.
 *    - Data.length <= limit.
 *    - No overlap in ids between page 1 and page 2.
 *    - When data.length > 1, created_at is also descending for page 2.
 * 5. If there is at least one page (pages >= 1), request the last page (page =
 *    pagination.pages) and verify:
 *
 *    - Pagination.current equals the requested last page.
 *    - Pagination.pages remains constant across calls.
 *    - Data.length <= limit.
 *    - When records % limit !== 0, the last page may have fewer than limit entries.
 *    - When data.length > 1, created_at is descending on the last page.
 *
 * The test is written to be robust when there are zero or few audit log
 * entries. In those cases, pagination invariants and ordering checks still
 * apply, but cross-page comparisons are skipped when pages < 2.
 */
export async function test_api_admin_audit_logs_search_pagination_and_ordering(
  connection: api.IConnection,
) {
  // 1. Register (join) a new admin to obtain an authenticated context.
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId = authorized.id;

  // 2. Request first page of audit logs for this admin with limit 10.
  const firstRequestBody: IShoppingMallAdminAuditLog.IRequest = {
    shopping_mall_admin_id: adminId,
    action_type: null,
    entity_type: null,
    entity_id: null,
    request_id: null,
    ip: null,
    user_agent: null,
    message: null,
    from_created_at: null,
    to_created_at: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  };

  const firstPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(firstPage);

  const pagination1 = firstPage.pagination;
  const data1 = firstPage.data;

  // 3. Basic pagination invariants for first page.
  TestValidator.equals("first page current index is 1", pagination1.current, 1);
  TestValidator.equals("first page limit is 10", pagination1.limit, 10);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination1.pages >= 0,
  );

  if (pagination1.records === 0) {
    TestValidator.equals("no records implies zero pages", pagination1.pages, 0);
    TestValidator.equals(
      "no records implies empty data array",
      data1.length,
      0,
    );
  } else {
    const expectedPages = Math.ceil(pagination1.records / pagination1.limit);
    TestValidator.equals(
      "pages is ceil(records/limit)",
      pagination1.pages,
      expectedPages,
    );
    TestValidator.predicate(
      "when records > 0, first page data is non-empty",
      data1.length > 0,
    );
  }

  TestValidator.predicate(
    "first page data length does not exceed limit",
    data1.length <= pagination1.limit,
  );

  // 3-1. Ordering check: created_at descending within first page.
  if (data1.length > 1) {
    for (let i = 0; i < data1.length - 1; i++) {
      const current = data1[i];
      const next = data1[i + 1];
      TestValidator.predicate(
        `created_at is descending within first page at index ${i}`,
        current.created_at >= next.created_at,
      );
    }
  }

  // 4. Second page checks when available.
  if (pagination1.pages >= 2) {
    const secondRequestBody: IShoppingMallAdminAuditLog.IRequest = {
      shopping_mall_admin_id: adminId,
      action_type: null,
      entity_type: null,
      entity_id: null,
      request_id: null,
      ip: null,
      user_agent: null,
      message: null,
      from_created_at: null,
      to_created_at: null,
      page: 2 as number & tags.Type<"int32">,
      limit: pagination1.limit,
    };

    const secondPage: IPageIShoppingMallAdminAuditLog.ISummary =
      await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
        connection,
        { body: secondRequestBody },
      );
    typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(secondPage);

    const pagination2 = secondPage.pagination;
    const data2 = secondPage.data;

    TestValidator.equals(
      "second page current index is 2",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "second page limit matches first page",
      pagination2.limit,
      pagination1.limit,
    );
    TestValidator.equals(
      "total records is consistent between first and second page",
      pagination2.records,
      pagination1.records,
    );
    TestValidator.equals(
      "total pages is consistent between first and second page",
      pagination2.pages,
      pagination1.pages,
    );
    TestValidator.predicate(
      "second page data length does not exceed limit",
      data2.length <= pagination2.limit,
    );

    // Ensure no overlap of ids between first and second page.
    const firstIds = new Set(data1.map((row) => row.id));
    for (const row of data2) {
      TestValidator.predicate(
        "no overlapping id between first and second page",
        firstIds.has(row.id) === false,
      );
    }

    // Ordering check for second page.
    if (data2.length > 1) {
      for (let i = 0; i < data2.length - 1; i++) {
        const current = data2[i];
        const next = data2[i + 1];
        TestValidator.predicate(
          `created_at is descending within second page at index ${i}`,
          current.created_at >= next.created_at,
        );
      }
    }
  }

  // 5. Last page checks when there is at least one page.
  if (pagination1.pages >= 1) {
    const lastPageIndex = pagination1.pages === 0 ? 1 : pagination1.pages;

    const lastRequestBody: IShoppingMallAdminAuditLog.IRequest = {
      shopping_mall_admin_id: adminId,
      action_type: null,
      entity_type: null,
      entity_id: null,
      request_id: null,
      ip: null,
      user_agent: null,
      message: null,
      from_created_at: null,
      to_created_at: null,
      page: lastPageIndex as number & tags.Type<"int32">,
      limit: pagination1.limit,
    };

    const lastPage: IPageIShoppingMallAdminAuditLog.ISummary =
      await api.functional.shoppingMall.admin.adminSearch.auditLogs.index(
        connection,
        { body: lastRequestBody },
      );
    typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(lastPage);

    const paginationLast = lastPage.pagination;
    const dataLast = lastPage.data;

    TestValidator.equals(
      "last page current index matches requested page",
      paginationLast.current,
      lastPageIndex,
    );
    TestValidator.equals(
      "last page total pages equals first page total pages",
      paginationLast.pages,
      pagination1.pages,
    );
    TestValidator.equals(
      "last page total records equals first page total records",
      paginationLast.records,
      pagination1.records,
    );
    TestValidator.predicate(
      "last page data length does not exceed limit",
      dataLast.length <= paginationLast.limit,
    );

    if (dataLast.length > 1) {
      for (let i = 0; i < dataLast.length - 1; i++) {
        const current = dataLast[i];
        const next = dataLast[i + 1];
        TestValidator.predicate(
          `created_at is descending within last page at index ${i}`,
          current.created_at >= next.created_at,
        );
      }
    }
  }
}
