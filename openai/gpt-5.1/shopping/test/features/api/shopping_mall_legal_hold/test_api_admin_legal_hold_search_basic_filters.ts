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

export async function test_api_admin_legal_hold_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed multiple legal holds with varying codes and statuses
  const baseStatusActive = "active";
  const baseStatusReleased = "released";

  const legalHoldCreateBodies: IShoppingMallLegalHold.ICreate[] = [
    {
      code: `LH-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: baseStatusActive,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
      effective_from: new Date().toISOString(),
    },
    {
      code: `LH-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: baseStatusActive,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
      effective_from: new Date().toISOString(),
    },
    {
      code: `LH-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      status: baseStatusReleased,
      scope_description: RandomGenerator.paragraph({ sentences: 4 }),
      external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
      effective_from: new Date().toISOString(),
    },
  ];

  const createdHolds: IShoppingMallLegalHold[] = [];
  for (const body of legalHoldCreateBodies) {
    const created = await api.functional.shoppingMall.admin.legalHolds.create(
      connection,
      { body },
    );
    typia.assert(created);
    createdHolds.push(created);
  }

  // 3. Update one legal hold to mark it as released
  const targetToRelease = createdHolds[0];
  const updateBody = {
    status: baseStatusReleased,
    released_at: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.IUpdate;

  const updatedReleasedHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode: targetToRelease.code,
      body: updateBody,
    });
  typia.assert(updatedReleasedHold);

  const normalizedHolds: IShoppingMallLegalHold[] = createdHolds.map((hold) =>
    hold.code === updatedReleasedHold.code ? updatedReleasedHold : hold,
  );

  // 4. Prepare created_at range window
  const createdTimes = normalizedHolds.map((h) =>
    new Date(h.created_at).getTime(),
  );
  const minCreated = Math.min(...createdTimes);
  const maxCreated = Math.max(...createdTimes);

  const createdFrom = new Date(minCreated).toISOString();
  const createdTo = new Date(maxCreated).toISOString();

  // 5. Build search request filtering by codes, status active, and created range
  const codesFilter = normalizedHolds.map((h) => h.code);
  const statusesFilter = [baseStatusActive];

  const searchRequestBody = {
    codes: codesFilter,
    statuses: statusesFilter,
    created_from: createdFrom,
    created_to: createdTo,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallLegalHold.IRequest;

  const pageResult: IPageIShoppingMallLegalHold.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.legalHolds.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  // 6. Compute expected active holds based on in-memory dataset and filters
  const expectedActive = normalizedHolds.filter((hold) => {
    const createdAtTime = new Date(hold.created_at).getTime();
    return (
      codesFilter.includes(hold.code) &&
      statusesFilter.includes(hold.status) &&
      createdAtTime >= minCreated &&
      createdAtTime <= maxCreated
    );
  });

  const expectedRecords = expectedActive.length;
  const expectedPage = 1;
  const expectedLimit = 10;
  const expectedPages =
    expectedRecords === 0 ? 0 : Math.ceil(expectedRecords / expectedLimit);

  // 7. Assert pagination correctness
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination.current should equal requested page",
    pagination.current,
    expectedPage,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    expectedLimit,
  );
  TestValidator.equals(
    "pagination.records should equal expected active count",
    pagination.records,
    expectedRecords,
  );
  TestValidator.equals(
    "pagination.pages should equal ceil(records/limit) or 0 when none",
    pagination.pages,
    expectedPages,
  );

  // 8. Assert data length and field-level consistency
  TestValidator.equals(
    "number of returned summaries should equal expected active holds",
    pageResult.data.length,
    expectedRecords,
  );

  const summariesById = new Map<string, IShoppingMallLegalHold.ISummary>();
  for (const s of pageResult.data) summariesById.set(s.id, s);

  for (const expected of expectedActive) {
    const summary = summariesById.get(expected.id);
    TestValidator.predicate(
      `summary for expected active hold ${expected.code} should exist`,
      !!summary,
    );
    if (!summary) continue;

    TestValidator.equals(
      `summary.code matches for ${expected.code}`,
      summary.code,
      expected.code,
    );
    TestValidator.equals(
      `summary.title matches for ${expected.code}`,
      summary.title,
      expected.title,
    );
    TestValidator.equals(
      `summary.status matches for ${expected.code}`,
      summary.status,
      expected.status,
    );
    TestValidator.equals(
      `summary.created_by_admin_id matches for ${expected.code}`,
      summary.created_by_admin_id,
      expected.created_by_admin_id,
    );
    TestValidator.equals(
      `summary.created_at matches for ${expected.code}`,
      summary.created_at,
      expected.created_at,
    );

    if (summary.created_by_admin) {
      TestValidator.equals(
        `summary.created_by_admin.id matches created_by_admin_id for ${expected.code}`,
        summary.created_by_admin.id,
        summary.created_by_admin_id,
      );
    }
  }

  // 9. Assert no unexpected holds returned (IDs must be subset of expectedActive)
  const expectedIds = new Set(expectedActive.map((h) => h.id));
  for (const summary of pageResult.data) {
    TestValidator.predicate(
      `every returned summary.id must be in expected active ids`,
      expectedIds.has(summary.id),
    );
  }
}
