import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

export async function test_api_seller_performance_snapshots_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare common search window and pagination params
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - thirtyDaysMs);

  const limitValue = 5 as number;

  const baseRequest = {
    snapshotDateFrom: from.toISOString(),
    snapshotDateTo: now.toISOString(),
    timezone: "Asia/Seoul",
    sortBy: "refund_rate",
    sortOrder: "desc",
    page: 1,
    limit: limitValue,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  // 3. First page search
  const page1: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: baseRequest,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page1);

  const pagination1 = page1.pagination;

  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1: current page should be 1",
    pagination1.current,
    1,
  );

  TestValidator.equals(
    "page 1: limit should equal requested limit",
    pagination1.limit,
    limitValue,
  );

  TestValidator.predicate(
    "page 1: total records should be >= data length",
    pagination1.records >= page1.data.length,
  );

  const expectedPages1 = Math.ceil(
    (pagination1.records as number) / (pagination1.limit || 1),
  );

  TestValidator.equals(
    "page 1: pages should equal ceil(records / limit)",
    pagination1.pages,
    expectedPages1,
  );

  // 5. Validate sorting on page 1 by refund_rate desc
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = page1.data[i];
      const next = page1.data[i + 1];

      TestValidator.predicate(
        `page 1: refund_rate should be non-increasing at index ${i}`,
        current.refund_rate >= next.refund_rate,
      );
    }
  }

  // 6. Second page search (page 2) with same filters
  const page2Request = {
    ...baseRequest,
    page: 2,
  } satisfies IShoppingMallSellerPerformanceSnapshot.IRequest;

  const page2: IPageIShoppingMallSellerPerformanceSnapshot.ISummary =
    await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert<IPageIShoppingMallSellerPerformanceSnapshot.ISummary>(page2);

  const pagination2 = page2.pagination;

  if (pagination1.pages >= 2 && pagination1.records > pagination1.limit) {
    // When there really should be multiple pages
    TestValidator.equals(
      "page 2: current page should be 2 when multiple pages exist",
      pagination2.current,
      2,
    );

    TestValidator.equals(
      "page 2: limit should equal requested limit",
      pagination2.limit,
      limitValue,
    );

    TestValidator.equals(
      "page 2: total records should match page 1",
      pagination2.records,
      pagination1.records,
    );

    TestValidator.equals(
      "page 2: pages should match page 1",
      pagination2.pages,
      pagination1.pages,
    );
  } else {
    // When only one logical page exists, just validate internal consistency
    TestValidator.predicate(
      "page 2: limit should be positive",
      pagination2.limit > 0,
    );

    TestValidator.predicate(
      "page 2: records should be >= data length",
      pagination2.records >= page2.data.length,
    );

    const expectedPages2 = Math.ceil(
      (pagination2.records as number) / (pagination2.limit || 1),
    );

    TestValidator.equals(
      "page 2: pages should equal ceil(records / limit)",
      pagination2.pages,
      expectedPages2,
    );
  }

  // 7. Validate sorting on page 2 by refund_rate desc
  if (page2.data.length > 1) {
    for (let i = 0; i < page2.data.length - 1; i++) {
      const current = page2.data[i];
      const next = page2.data[i + 1];

      TestValidator.predicate(
        `page 2: refund_rate should be non-increasing at index ${i}`,
        current.refund_rate >= next.refund_rate,
      );
    }
  }

  // 8. Validate non-overlapping snapshot IDs between page 1 and page 2
  if (
    pagination1.pages >= 2 &&
    pagination1.records > pagination1.limit &&
    page1.data.length > 0 &&
    page2.data.length > 0
  ) {
    const page1Ids = new Set<string>();
    for (const snapshot of page1.data) page1Ids.add(snapshot.id);

    for (const snapshot of page2.data) {
      TestValidator.predicate(
        "snapshot IDs on page 2 should not overlap with page 1",
        page1Ids.has(snapshot.id) === false,
      );
    }
  }
}
