import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_admin_action_audits_sorting_and_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build base request for analytics: page 1, limit 10, sort by createdAt desc.
  //    Note: IRequest.sortBy is a free-form string; we align to the documented
  //    semantics by using a reasonable field name. The backend ultimately
  //    validates supported values.
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "createdAt",
    sortDirection: "desc" as const,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  // 3. Call analytics for page 1
  const page1: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(page1);

  // 4. Call analytics for page 2 with identical filters except page index
  const page2Request = {
    ...baseRequest,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallAdminActionAudit.IRequest;

  const page2: IPageIShoppingMallAdminActionAudit.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminActionAudits.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert<IPageIShoppingMallAdminActionAudit.ISummary>(page2);

  const p1 = page1.pagination;
  const p2 = page2.pagination;

  // 5. Basic pagination metadata checks
  TestValidator.equals(
    "page1 pagination.current should reflect the first page (0-based)",
    p1.current,
    0,
  );
  TestValidator.equals(
    "page1 pagination.limit should reflect requested limit",
    p1.limit,
    10,
  );

  TestValidator.equals(
    "page2 pagination.limit should match page1 limit",
    p2.limit,
    p1.limit,
  );

  TestValidator.equals(
    "total records must be consistent across pages",
    p2.records,
    p1.records,
  );

  // 6. Sorting validation helper
  const assertSortedDescByCreatedAt = (
    title: string,
    items: IShoppingMallAdminActionAudit.ISummary[],
  ): void => {
    if (items.length <= 1) return;
    for (let i = 1; i < items.length; ++i) {
      const prevTs = new Date(items[i - 1].created_at).getTime();
      const currTs = new Date(items[i].created_at).getTime();
      TestValidator.predicate(
        `${title} - created_at must be non-increasing between index ${i - 1} and ${i}`,
        prevTs >= currTs,
      );
    }
  };

  // 7. Validate sorting within each page
  assertSortedDescByCreatedAt("page1 sort order", page1.data);
  assertSortedDescByCreatedAt("page2 sort order", page2.data);

  // 8. Cross-page consistency checks when we have enough data for two pages.
  const idsPage1 = new Set(page1.data.map((it) => it.id));
  const idsPage2 = new Set(page2.data.map((it) => it.id));

  if (p1.records > p1.limit) {
    // When total records exceed one page, page1 should have data.
    TestValidator.predicate(
      "page1 should contain at least one record when total records > limit",
      page1.data.length > 0,
    );
  }

  if (p1.records > p1.limit * 2) {
    // When there are enough records for at least two full pages, we can require
    // that page2 has items and does not overlap with page1.
    TestValidator.predicate(
      "page2 should contain at least one record when total records > 2 * limit",
      page2.data.length > 0,
    );

    const hasOverlap = Array.from(idsPage1).some((id) => idsPage2.has(id));
    TestValidator.predicate(
      "no audit record id should appear in both page1 and page2 when there are more than two pages of data",
      !hasOverlap,
    );
  }

  // 9. Optional: boundary consistency check using first items of page1 and page2
  if (page1.data.length > 0 && page2.data.length > 0) {
    const first1 = page1.data[0];
    const first2 = page2.data[0];

    const ts1 = new Date(first1.created_at).getTime();
    const ts2 = new Date(first2.created_at).getTime();

    TestValidator.predicate(
      "first item of page1 should be newer-or-equal to first item of page2 in desc ordering",
      ts1 >= ts2,
    );
  }
}
