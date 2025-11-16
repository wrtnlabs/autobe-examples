import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategoryTree";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_tree_search_with_filters_and_date_ranges(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated admin context.
  const joinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create Tree A (active=true, defaultLocale="en-US")
  const treeACode = `main_catalog_en_${RandomGenerator.alphaNumeric(6)}`;
  const treeABody = {
    code: treeACode,
    name: "Main Catalog EN",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const treeA: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeABody },
    );
  typia.assert<IShoppingMallCategoryTree>(treeA);

  // 2. Create Tree B (active=false, defaultLocale="ko-KR")
  const treeBCode = `archive_ko_${RandomGenerator.alphaNumeric(6)}`;
  const treeBBody = {
    code: treeBCode,
    name: "Archive KO",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: false,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const treeB: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBBody },
    );
  typia.assert<IShoppingMallCategoryTree>(treeB);

  // 3. Capture createdAt/updatedAt timestamps for both trees.
  const treeACreatedAt = treeA.createdAt;
  const treeAUpdatedAt = treeA.updatedAt;
  const treeBCreatedAt = treeB.createdAt;
  const treeBUpdatedAt = treeB.updatedAt;

  // Helper to build a narrow inclusive range around a date-time string.
  const buildRangeAround = (
    iso: string & tags.Format<"date-time">,
  ): {
    from: string & tags.Format<"date-time">;
    to: string & tags.Format<"date-time">;
  } => {
    const base = new Date(iso);
    const from = new Date(base.getTime() - 1_000).toISOString();
    const to = new Date(base.getTime() + 1_000).toISOString();
    return {
      from: from as string & tags.Format<"date-time">,
      to: to as string & tags.Format<"date-time">,
    };
  };

  const aCreatedRange = buildRangeAround(treeACreatedAt);
  const aUpdatedRange = buildRangeAround(treeAUpdatedAt);

  // 4. Build search request targeting only Tree A.
  const searchARequest = {
    search: undefined,
    codes: [treeA.code],
    defaultLocales: ["en-US"],
    active: true,
    createdFrom: aCreatedRange.from,
    createdTo: aCreatedRange.to,
    updatedFrom: aUpdatedRange.from,
    updatedTo: aUpdatedRange.to,
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallCategoryTree.IRequest;

  const pageA: IPageIShoppingMallCategoryTree.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      { body: searchARequest },
    );
  typia.assert<IPageIShoppingMallCategoryTree.ISummary>(pageA);

  const paginationA = pageA.pagination;
  const dataA = pageA.data;

  // 5. Assert pagination semantics for first search.
  TestValidator.equals(
    "pagination.current is 0 for first page",
    paginationA.current,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "pagination.limit >= data length",
    paginationA.limit >= dataA.length,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    paginationA.records >= dataA.length,
  );
  TestValidator.predicate(
    "pagination.pages is positive when records exist",
    paginationA.records === 0
      ? paginationA.pages === 0
      : paginationA.pages >= 1,
  );

  // 6. Validate that all returned entries satisfy filters for Tree A.
  for (const summary of dataA) {
    TestValidator.predicate(
      "summary.active is true for Tree A search",
      summary.active === true,
    );
    if (summary.default_locale !== undefined) {
      TestValidator.equals(
        "summary.default_locale is en-US when defined",
        summary.default_locale,
        "en-US",
      );
    }
    TestValidator.predicate(
      "summary.code is one of requested codes (Tree A)",
      searchARequest.codes !== undefined &&
        searchARequest.codes.includes(summary.code),
    );
  }

  // 7. Assert Tree A is included and Tree B is not in search A results.
  const hasTreeAInA = dataA.some((s) => s.code === treeA.code);
  const hasTreeBInA = dataA.some((s) => s.code === treeB.code);

  TestValidator.predicate("Tree A appears in search A results", hasTreeAInA);
  TestValidator.predicate(
    "Tree B does not appear in search A results",
    hasTreeBInA === false,
  );

  // 8. Second search targeting Tree B with active=false and ko-KR locale.
  const bCreatedRange = buildRangeAround(treeBCreatedAt);
  const bUpdatedRange = buildRangeAround(treeBUpdatedAt);

  const searchBRequest = {
    search: undefined,
    codes: [treeB.code],
    defaultLocales: ["ko-KR"],
    active: false,
    createdFrom: bCreatedRange.from,
    createdTo: bCreatedRange.to,
    updatedFrom: bUpdatedRange.from,
    updatedTo: bUpdatedRange.to,
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallCategoryTree.IRequest;

  const pageB: IPageIShoppingMallCategoryTree.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      { body: searchBRequest },
    );
  typia.assert<IPageIShoppingMallCategoryTree.ISummary>(pageB);

  const paginationB = pageB.pagination;
  const dataB = pageB.data;

  TestValidator.equals(
    "pagination.current is 0 for Tree B search",
    paginationB.current,
    0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "pagination.limit >= data length for Tree B",
    paginationB.limit >= dataB.length,
  );
  TestValidator.predicate(
    "pagination.records >= data length for Tree B",
    paginationB.records >= dataB.length,
  );
  TestValidator.predicate(
    "pagination.pages is positive when records exist for Tree B",
    paginationB.records === 0
      ? paginationB.pages === 0
      : paginationB.pages >= 1,
  );

  for (const summary of dataB) {
    TestValidator.predicate(
      "summary.active is false for Tree B search",
      summary.active === false,
    );
    if (summary.default_locale !== undefined) {
      TestValidator.equals(
        "summary.default_locale is ko-KR when defined",
        summary.default_locale,
        "ko-KR",
      );
    }
    TestValidator.predicate(
      "summary.code is one of requested codes (Tree B)",
      searchBRequest.codes !== undefined &&
        searchBRequest.codes.includes(summary.code),
    );
  }

  const hasTreeBInB = dataB.some((s) => s.code === treeB.code);
  const hasTreeAInB = dataB.some((s) => s.code === treeA.code);

  TestValidator.predicate("Tree B appears in search B results", hasTreeBInB);
  TestValidator.predicate(
    "Tree A does not appear in search B results",
    hasTreeAInB === false,
  );
}
