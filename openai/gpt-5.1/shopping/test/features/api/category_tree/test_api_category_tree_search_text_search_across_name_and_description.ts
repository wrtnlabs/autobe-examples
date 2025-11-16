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
 * Validate free-text search over category tree name and description for
 * platform admins.
 *
 * Business context: Platform administrators manage logical category trees that
 * structure the shopping mall catalog. They must be able to quickly locate
 * trees by searching over both the human-readable `name` and the more detailed
 * `description` fields.
 *
 * This test validates that the category tree search endpoint PATCH
 * /shoppingMall/platformAdmin/categoryTrees correctly performs free-text
 * matching across name and description, and that pagination metadata remains
 * consistent with the number of matched records.
 *
 * Test steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join and rely on the
 *    SDK to attach the JWT access token to the shared connection.
 * 2. As that admin, create two category trees via POST
 *    /shoppingMall/platformAdmin/categoryTrees:
 *
 *    - Tree X with a name that includes "Electronics & Gadgets" and a description
 *         containing the keyword "smartphone".
 *    - Tree Y with a clearly different name and description that do NOT contain the
 *         word "smartphone".
 * 3. Call PATCH /shoppingMall/platformAdmin/categoryTrees with a
 *    IShoppingMallCategoryTree.IRequest body where:
 *
 *    - Search = "smartphone" (a term only present in Tree X description),
 *    - Page = 0 (first page, as per IPage.IPagination semantics),
 *    - Limit is sufficiently large (e.g., 20) to include all matches in one page.
 * 4. Assert the response structure using typia.assert, including pagination and
 *    data array.
 * 5. Verify that:
 *
 *    - At least one returned summary entry matches Tree X's id and code.
 *    - No returned entry matches Tree Y's id and code.
 *    - Pagination.records is greater than or equal to data.length and is positive
 *         when Tree X is found.
 * 6. Perform an additional search using a token from Tree X's name, such as
 *    "Electronics", and assert that Tree X again appears in the result set.
 */
export async function test_api_category_tree_search_text_search_across_name_and_description(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authorized session
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
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create two category trees with distinct names/descriptions
  const treeXName = "Electronics & Gadgets";
  const treeXCode = `electronics_${RandomGenerator.alphaNumeric(8)}`;
  const treeXDescription = `${RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  })} smartphone ${RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  })}`;

  const treeXBody = {
    code: treeXCode,
    name: treeXName,
    description: treeXDescription,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const treeX: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeXBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(treeX);

  const treeYName = "Home & Kitchen";
  const treeYCode = `home_kitchen_${RandomGenerator.alphaNumeric(8)}`;
  const treeYDescription = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 4,
    wordMax: 10,
  });

  const treeYBody = {
    code: treeYCode,
    name: treeYName,
    description: treeYDescription,
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const treeY: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeYBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(treeY);

  // 3. Search by keyword appearing only in Tree X description
  const searchKeyword = "smartphone";
  const searchRequest = {
    search: searchKeyword,
    page: 0,
    limit: 20,
  } satisfies IShoppingMallCategoryTree.IRequest;

  const searchResult: IPageIShoppingMallCategoryTree.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCategoryTree.ISummary>(searchResult);
  typia.assert<IPage.IPagination>(searchResult.pagination);

  const { pagination, data } = searchResult;

  // 4. Basic pagination invariants
  TestValidator.equals("current page index should be 0", pagination.current, 0);
  TestValidator.predicate("limit should be positive", pagination.limit > 0);
  TestValidator.predicate(
    "records must be >= number of data entries",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pages must be 0 when no records or >= 1 when records exist",
    (pagination.records === 0 && pagination.pages === 0) ||
      (pagination.records > 0 && pagination.pages >= 1),
  );

  // 5. Ensure Tree X is present and Tree Y is absent in search results
  const hasTreeX = data.some((summary) => summary.id === treeX.id);
  const hasTreeY = data.some((summary) => summary.id === treeY.id);

  TestValidator.predicate(
    "search results should contain Tree X when searching by description keyword",
    hasTreeX,
  );
  TestValidator.predicate(
    "search results should not contain Tree Y when searching by description keyword",
    !hasTreeY,
  );

  const summaryX = data.find((summary) => summary.id === treeX.id);
  if (summaryX !== undefined) {
    TestValidator.equals(
      "summaryX.code should match created Tree X code",
      summaryX.code,
      treeX.code,
    );
    TestValidator.equals(
      "summaryX.name should match created Tree X name",
      summaryX.name,
      treeX.name,
    );
  }

  // 6. Additional search by name token (e.g., "Electronics")
  const nameToken = "Electronics";
  const nameSearchRequest = {
    search: nameToken,
    page: 0,
    limit: 20,
  } satisfies IShoppingMallCategoryTree.IRequest;

  const nameSearchResult: IPageIShoppingMallCategoryTree.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      {
        body: nameSearchRequest,
      },
    );
  typia.assert<IPageIShoppingMallCategoryTree.ISummary>(nameSearchResult);

  const hasTreeXByName = nameSearchResult.data.some(
    (summary) => summary.id === treeX.id,
  );

  TestValidator.predicate(
    "search by name token should still find Tree X",
    hasTreeXByName,
  );
}
