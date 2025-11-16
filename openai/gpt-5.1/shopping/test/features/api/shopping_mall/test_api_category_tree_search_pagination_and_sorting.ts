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

/**
 * Validate category tree pagination and sorting for platform admins.
 *
 * Business goal
 *
 * - Ensure that PATCH /shoppingMall/platformAdmin/categoryTrees supports
 *   server-side pagination and ordering by `code`, and that the ordering is
 *   consistent between ascending and descending requests.
 * - Use seeded category trees with a unique prefix so the test can assert
 *   relative ordering robustly even when other data exists in the system.
 *
 * Steps
 *
 * 1. Join a platform admin (POST /auth/platformAdmin/join), which also configures
 *    the connection with a valid Authorization header.
 * 2. Create three category trees with predictable `code` values that sort
 *    lexicographically: `${prefix}-a`, `${prefix}-b`, `${prefix}-c`.
 * 3. Call the index endpoint in ascending order by `code` with pagination (page=0,
 *    limit=2) and then (page=1, limit=2), validating pagination metadata and
 *    that, in the combined result, our three codes appear in ascending order.
 * 4. Call the index endpoint again in descending order by `code` and verify that
 *    the same three codes appear in reverse order.
 *
 * Type usage
 *
 * - IShoppingMallPlatformAdminJoin.IRequest for join body
 * - IShoppingMallPlatformAdmin.IAuthorized for the join response
 * - IShoppingMallCategoryTree.ICreate for create body
 * - IShoppingMallCategoryTree for create response
 * - IShoppingMallCategoryTree.IRequest for index body
 * - IPageIShoppingMallCategoryTree.ISummary for index response
 * - IPage.IPagination for pagination metadata
 */
export async function test_api_category_tree_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join platform admin (authentication bootstrap)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Seed three category trees with predictable codes
  const prefix = `ct-${RandomGenerator.alphaNumeric(8)}`;
  const codes = [`${prefix}-a`, `${prefix}-b`, `${prefix}-c`];

  const createdTrees: IShoppingMallCategoryTree[] = [];
  for (const code of codes) {
    const body = {
      code,
      name: `Category Tree ${code}`,
      description: `Description for ${code}`,
      active: true,
      defaultLocale: "en-US",
    } satisfies IShoppingMallCategoryTree.ICreate;

    const tree =
      await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallCategoryTree>(tree);
    createdTrees.push(tree);
  }

  TestValidator.equals("three category trees created", createdTrees.length, 3);

  // Helper to call index with arbitrary body and assert response
  const fetchIndex = async (
    page: number & tags.Type<"int32">,
    limit: number & tags.Type<"int32">,
    orderDirection: string,
  ): Promise<IPageIShoppingMallCategoryTree.ISummary> => {
    const requestBody = {
      search: undefined,
      codes: undefined,
      defaultLocales: undefined,
      active: null,
      createdFrom: null,
      createdTo: null,
      updatedFrom: null,
      updatedTo: null,
      page,
      limit,
      orderBy: "code",
      orderDirection,
    } satisfies IShoppingMallCategoryTree.IRequest;

    const res =
      await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
        connection,
        { body: requestBody },
      );
    typia.assert<IPageIShoppingMallCategoryTree.ISummary>(res);
    return res;
  };

  // Helper to get all trees containing our prefix in a single page
  const fetchAllAsc =
    async (): Promise<IPageIShoppingMallCategoryTree.ISummary> => {
      const requestBody = {
        search: undefined,
        codes: undefined,
        defaultLocales: undefined,
        active: null,
        createdFrom: null,
        createdTo: null,
        updatedFrom: null,
        updatedTo: null,
        page: 0 as number & tags.Type<"int32">,
        limit: 100 as number & tags.Type<"int32">,
        orderBy: "code",
        orderDirection: "asc",
      } satisfies IShoppingMallCategoryTree.IRequest;

      const res =
        await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
          connection,
          { body: requestBody },
        );
      typia.assert<IPageIShoppingMallCategoryTree.ISummary>(res);
      return res;
    };

  // 3. Ascending order pagination checks
  const ascPage0 = await fetchIndex(
    0 as number & tags.Type<"int32">,
    2 as number & tags.Type<"int32">,
    "asc",
  );
  const ascPage1 = await fetchIndex(
    1 as number & tags.Type<"int32">,
    2 as number & tags.Type<"int32">,
    "asc",
  );

  const ascPagination0 = ascPage0.pagination;
  const ascPagination1 = ascPage1.pagination;

  TestValidator.equals("asc page0 current index", ascPagination0.current, 0);
  TestValidator.equals("asc page1 current index", ascPagination1.current, 1);
  TestValidator.equals("asc page0 limit is 2", ascPagination0.limit, 2);
  TestValidator.equals("asc page1 limit is 2", ascPagination1.limit, 2);

  TestValidator.predicate(
    "asc records non-negative",
    ascPagination0.records >= 0,
  );
  TestValidator.equals(
    "asc records consistent between pages",
    ascPagination0.records,
    ascPagination1.records,
  );
  TestValidator.predicate(
    "asc pages sufficient for records",
    ascPagination0.pages === 0
      ? ascPagination0.records === 0
      : ascPagination0.pages * ascPagination0.limit >= ascPagination0.records,
  );

  // get a full snapshot to reason about our seeded trees
  const ascAll = await fetchAllAsc();
  const ascAllCodes = ascAll.data
    .filter((s) => s.code.startsWith(prefix))
    .map((s) => s.code);

  TestValidator.equals(
    "all three seeded codes must be present in asc list",
    ascAllCodes.sort(),
    [...codes].sort(),
  );

  // Verify relative order in asc (a < b < c)
  const indexAAsc = ascAllCodes.indexOf(codes[0]);
  const indexBAsc = ascAllCodes.indexOf(codes[1]);
  const indexCAsc = ascAllCodes.indexOf(codes[2]);

  TestValidator.predicate(
    "all seeded codes appear in asc sequence",
    indexAAsc !== -1 && indexBAsc !== -1 && indexCAsc !== -1,
  );
  TestValidator.predicate(
    "ascending order is a < b < c",
    indexAAsc < indexBAsc && indexBAsc < indexCAsc,
  );

  // 4. Descending order pagination and ordering checks
  const descRequestBodyAll = {
    search: undefined,
    codes: undefined,
    defaultLocales: undefined,
    active: null,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    page: 0 as number & tags.Type<"int32">,
    limit: 100 as number & tags.Type<"int32">,
    orderBy: "code",
    orderDirection: "desc",
  } satisfies IShoppingMallCategoryTree.IRequest;

  const descAll =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      { body: descRequestBodyAll },
    );
  typia.assert<IPageIShoppingMallCategoryTree.ISummary>(descAll);

  const descCodes = descAll.data
    .filter((s) => s.code.startsWith(prefix))
    .map((s) => s.code);

  TestValidator.equals(
    "all three seeded codes must be present in desc list",
    descCodes.sort(),
    [...codes].sort(),
  );

  const indexADesc = descCodes.indexOf(codes[0]);
  const indexBDesc = descCodes.indexOf(codes[1]);
  const indexCDesc = descCodes.indexOf(codes[2]);

  TestValidator.predicate(
    "all seeded codes appear in desc sequence",
    indexADesc !== -1 && indexBDesc !== -1 && indexCDesc !== -1,
  );
  TestValidator.predicate(
    "descending order is c > b > a",
    indexCDesc < indexBDesc && indexBDesc < indexADesc,
  );
}
