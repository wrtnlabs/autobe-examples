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
 * Validate admin audit log pagination and empty-result handling.
 *
 * Business intent:
 *
 * - Ensure that an authenticated administrator can query the immutable
 *   shopping_mall_admin_audit_logs store via PATCH
 *   /shoppingMall/admin/adminAuditLogs and receive correct pagination metadata
 *   both when there are no matching records and when there are some records.
 * - Confirm that the pagination math (records, pages, limit, current) and basic
 *   page slicing behavior are consistent with the IPage.IPagination contract,
 *   without relying on undocumented internal semantics of action_type or
 *   entity_type.
 *
 * High level steps
 *
 * 1. Join an admin account to obtain an authenticated admin context.
 * 2. Create an admin permission to guarantee at least one audit log entry exists
 *    in the system (assuming audit logging is wired to this operation).
 * 3. Issue an audit log search with a future-only created_at window so that zero
 *    records are expected, and validate that the response expresses an empty
 *    page correctly.
 * 4. Issue a broad audit log search with a very small limit (e.g., 1) to verify
 *    pagination over an actually non-empty result set, including page counts
 *    and page slicing.
 */
export async function test_api_admin_audit_logs_pagination_and_empty_result(
  connection: api.IConnection,
) {
  // 1. Join an admin account (dependency: POST /auth/admin/join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin permission to ensure at least one audit log exists
  const permissionBody = {
    code: `perm.${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "test_audit_pagination",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(permission);

  // 3. Empty-result search using a future created_at window
  const now = new Date();
  const futureFrom: string & tags.Format<"date-time"> = RandomGenerator.date(
    now,
    365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const futureTo: string & tags.Format<"date-time"> = RandomGenerator.date(
    now,
    2 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const emptyRequest = {
    from_created_at: futureFrom,
    to_created_at: futureTo,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const emptyPage: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: emptyRequest,
    });
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(emptyPage);

  const emptyPagination = emptyPage.pagination;
  typia.assert<IPage.IPagination>(emptyPagination);

  // Validate empty result semantics
  TestValidator.equals(
    "empty search should return zero records",
    emptyPagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should return empty data array",
    emptyPage.data.length,
    0,
  );
  TestValidator.predicate(
    "empty search pages should be non-negative",
    emptyPagination.pages >= 0,
  );
  TestValidator.predicate(
    "empty search current page should be non-negative",
    emptyPagination.current >= 0,
  );

  // 4. Non-empty pagination scenario with small limit (e.g., 1)
  const limit = 1 as number & tags.Type<"int32">;
  const page1Request = {
    page: 1 as number & tags.Type<"int32">,
    limit,
  } satisfies IShoppingMallAdminAuditLog.IRequest;

  const page1: IPageIShoppingMallAdminAuditLog.ISummary =
    await api.functional.shoppingMall.admin.adminAuditLogs.index(connection, {
      body: page1Request,
    });
  typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(page1);
  const p1 = page1.pagination;
  typia.assert<IPage.IPagination>(p1);

  // Basic pagination invariants
  TestValidator.predicate(
    "page1 records should be non-negative",
    p1.records >= 0,
  );
  TestValidator.predicate("page1 pages should be non-negative", p1.pages >= 0);
  TestValidator.predicate("page1 limit should be positive", p1.limit > 0);
  TestValidator.predicate(
    "page1 data length should not exceed limit",
    page1.data.length <= p1.limit,
  );

  if (p1.records > 0) {
    // If backend honors requested limit exactly, p1.limit === limit; otherwise
    // at least ensure p1.limit is positive and not greater than requested
    TestValidator.predicate(
      "page1.limit should not exceed requested limit",
      p1.limit <= limit,
    );

    const expectedPages = Math.ceil(p1.records / p1.limit);
    TestValidator.equals(
      "pages should equal ceil(records / limit)",
      p1.pages,
      expectedPages,
    );

    // Optional: check created_at descending order within page 1
    TestValidator.predicate("page1 created_at should be non-increasing", () => {
      for (let i = 1; i < page1.data.length; ++i) {
        const prev = page1.data[i - 1]!.created_at;
        const curr = page1.data[i]!.created_at;
        if (prev < curr) return false;
      }
      return true;
    });

    // If we have more than one page, fetch page 2 and verify slicing
    if (p1.records > p1.limit && p1.pages >= 2) {
      const page2Request = {
        page: 2 as number & tags.Type<"int32">,
        limit,
      } satisfies IShoppingMallAdminAuditLog.IRequest;

      const page2: IPageIShoppingMallAdminAuditLog.ISummary =
        await api.functional.shoppingMall.admin.adminAuditLogs.index(
          connection,
          {
            body: page2Request,
          },
        );
      typia.assert<IPageIShoppingMallAdminAuditLog.ISummary>(page2);
      const p2 = page2.pagination;
      typia.assert<IPage.IPagination>(p2);

      TestValidator.predicate(
        "page2 data length should not exceed limit",
        page2.data.length <= p2.limit,
      );

      // Ensure page1 and page2 do not contain duplicate IDs as a simple
      // pagination correctness proxy
      const ids1 = page1.data.map((log) => log.id);
      const ids2 = page2.data.map((log) => log.id);
      const set1 = new Set(ids1);
      const duplicate = ids2.some((id) => set1.has(id));
      TestValidator.predicate(
        "page1 and page2 should not share audit log IDs",
        duplicate === false,
      );
    }
  }
}
