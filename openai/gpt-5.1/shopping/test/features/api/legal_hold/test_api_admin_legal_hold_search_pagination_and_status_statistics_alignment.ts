import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallLegalHold";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_admin_legal_hold_search_pagination_and_status_statistics_alignment(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed legal holds: create enough to span multiple pages
  const totalHoldsToCreate = 45; // > 2 pages when limit = 20
  const createdHolds: IShoppingMallLegalHold[] = [];

  // We will create some initially active and some initially released
  const ACTIVE_STATUS = "active" as const;
  const RELEASED_STATUS = "released" as const;

  let expectedActiveCount = 0;
  let expectedReleasedCount = 0;

  for (let i = 0; i < totalHoldsToCreate; i++) {
    const initialStatus = i % 2 === 0 ? ACTIVE_STATUS : RELEASED_STATUS;

    const createBody = {
      code: `LH-${RandomGenerator.alphaNumeric(12)}-${i}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: initialStatus,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: `CASE-${RandomGenerator.alphaNumeric(8)}`,
      effective_from: null,
    } satisfies IShoppingMallLegalHold.ICreate;

    const created = await api.functional.shoppingMall.admin.legalHolds.create(
      connection,
      {
        body: createBody,
      },
    );
    typia.assert<IShoppingMallLegalHold>(created);
    createdHolds.push(created);

    if (initialStatus === ACTIVE_STATUS) expectedActiveCount++;
    else expectedReleasedCount++;
  }

  // 3. Transition some holds from active to released using PUT update
  //    For example, update first 10 active holds to released
  let transitionedCount = 0;
  for (const hold of createdHolds) {
    if (transitionedCount >= 10) break;
    if (hold.status !== ACTIVE_STATUS) continue;

    const updateBody = {
      status: RELEASED_STATUS,
      released_at: new Date().toISOString(),
    } satisfies IShoppingMallLegalHold.IUpdate;

    const updated = await api.functional.shoppingMall.admin.legalHolds.update(
      connection,
      {
        legalHoldCode: hold.code,
        body: updateBody,
      },
    );
    typia.assert<IShoppingMallLegalHold>(updated);

    transitionedCount++;
    expectedActiveCount--;
    expectedReleasedCount++;
  }

  // Sanity-check that we actually transitioned some holds
  TestValidator.predicate(
    "at least one legal hold transitioned from active to released",
    transitionedCount > 0,
  );

  // 4. Paginated search without status filter, with explicit pagination
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 20 as number;

  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallLegalHold.IRequest;

  const firstPage =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      {
        body: firstPageRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(firstPage);

  const pagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // Basic pagination expectations
  TestValidator.equals(
    "first page current index must be 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit must match requested limit",
    pagination.limit,
    limit,
  );

  // Total records should match number of created holds (no deletions in test)
  TestValidator.equals(
    "total records equals number of created legal holds",
    pagination.records,
    totalHoldsToCreate,
  );

  const expectedPages = Math.ceil(totalHoldsToCreate / limit);
  TestValidator.equals(
    "pagination pages equals ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  // First page size expectations
  TestValidator.equals(
    "first page should contain up to limit records",
    firstPage.data.length,
    Math.min(limit, totalHoldsToCreate),
  );

  // 5. Iterate through all pages and gather IDs, codes, and status counts
  const seenIds = new Set<string>();
  const seenCodes = new Set<string>();

  let observedActiveCount = 0;
  let observedReleasedCount = 0;

  const collectPage = (page: IPageIShoppingMallLegalHold.ISummary) => {
    for (const summary of page.data) {
      // Ensure no duplicate ids or codes across pages
      TestValidator.predicate(
        "legal hold id must not repeat across pages",
        seenIds.has(summary.id) === false,
      );
      TestValidator.predicate(
        "legal hold code must not repeat across pages",
        seenCodes.has(summary.code) === false,
      );

      seenIds.add(summary.id);
      seenCodes.add(summary.code);

      if (summary.status === ACTIVE_STATUS) observedActiveCount++;
      else if (summary.status === RELEASED_STATUS) observedReleasedCount++;
    }
  };

  collectPage(firstPage);

  for (let pageIndex = 2; pageIndex <= pagination.pages; pageIndex++) {
    const pageRequestBody = {
      page: pageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
    } satisfies IShoppingMallLegalHold.IRequest;

    const page =
      await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
        connection,
        { body: pageRequestBody },
      );
    typia.assert<IPageIShoppingMallLegalHold.ISummary>(page);

    // Each page's pagination.current must equal the requested page index
    TestValidator.equals(
      "pagination current must match requested page index",
      page.pagination.current,
      pageIndex,
    );

    // All pages should share the same limit and total records/pages
    TestValidator.equals(
      "pagination limit consistent across pages",
      page.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "pagination records consistent across pages",
      page.pagination.records,
      pagination.records,
    );
    TestValidator.equals(
      "pagination pages consistent across pages",
      page.pagination.pages,
      pagination.pages,
    );

    // Page size behaviour: full limit except possibly last page
    const expectedLength =
      pageIndex < pagination.pages
        ? limit
        : totalHoldsToCreate - limit * (pagination.pages - 1);

    TestValidator.equals(
      "page size must be limit except for last page",
      page.data.length,
      expectedLength,
    );

    collectPage(page);
  }

  // After scanning all pages, ensure we saw exactly all created records
  TestValidator.equals(
    "number of unique ids must equal total records",
    seenIds.size,
    totalHoldsToCreate,
  );
  TestValidator.equals(
    "number of unique codes must equal total records",
    seenCodes.size,
    totalHoldsToCreate,
  );

  // 6. Status distribution alignment: observed vs expected
  TestValidator.equals(
    "observed active count in search equals expected active count",
    observedActiveCount,
    expectedActiveCount,
  );
  TestValidator.equals(
    "observed released count in search equals expected released count",
    observedReleasedCount,
    expectedReleasedCount,
  );

  // 7. Targeted status searches to cross-check counts
  // Active-only search
  const activeSearchBody = {
    statuses: [ACTIVE_STATUS],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallLegalHold.IRequest;

  const activePage =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      { body: activeSearchBody },
    );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(activePage);

  TestValidator.equals(
    "active-only search total records matches observed active count",
    activePage.pagination.records,
    observedActiveCount,
  );

  // Released-only search
  const releasedSearchBody = {
    statuses: [RELEASED_STATUS],
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallLegalHold.IRequest;

  const releasedPage =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      { body: releasedSearchBody },
    );
  typia.assert<IPageIShoppingMallLegalHold.ISummary>(releasedPage);

  TestValidator.equals(
    "released-only search total records matches observed released count",
    releasedPage.pagination.records,
    observedReleasedCount,
  );
}
