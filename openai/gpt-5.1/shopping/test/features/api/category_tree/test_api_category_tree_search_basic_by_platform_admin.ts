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
 * Validate basic category tree search for platform administrators using default
 * filters.
 *
 * Business context: Platform admins manage catalog category trees. This test
 * ensures that an authenticated platform admin can retrieve category tree
 * summaries using the search endpoint with only basic pagination configured,
 * and that newly created trees show up in the paginated result with correct
 * summary fields and pagination metadata.
 *
 * Steps:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join, which
 *    automatically issues JWT tokens and wires them into the SDK connection.
 * 2. As this admin, create a new category tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees with meaningful values for code,
 *    name, active, and defaultLocale.
 * 3. Call PATCH /shoppingMall/platformAdmin/categoryTrees with an
 *    IShoppingMallCategoryTree.IRequest that only specifies page and limit,
 *    leaving all other filters undefined so the backend uses default search
 *    scope.
 * 4. Verify that the response is a valid IPageIShoppingMallCategoryTree.ISummary
 *    object and that pagination.current, pagination.limit, and record counts
 *    behave as expected when requesting the first page.
 * 5. Assert that the created category tree appears in the returned data array and
 *    that its summary fields (id, code, name, active,
 *    default_locale/description if set) are consistent with the create
 *    request.
 */
export async function test_api_category_tree_search_basic_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Passw0rd!", // simple valid password
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline category tree that should appear in search results.
  const treeCodePrefix = "e2e-tree-";
  const treeCode = `${treeCodePrefix}${RandomGenerator.alphaNumeric(12)}`;
  const treeName = RandomGenerator.name();
  const treeDescription = RandomGenerator.paragraph({ sentences: 5 });
  const defaultLocale = "en-US";

  const createBody = {
    code: treeCode,
    name: treeName,
    description: treeDescription,
    active: true,
    defaultLocale,
  } satisfies IShoppingMallCategoryTree.ICreate;

  const createdTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdTree);

  // 3. Search category trees with only pagination configured.
  const requestPage = 1;
  const requestedLimit = 10;

  const searchBody = {
    page: requestPage,
    limit: requestedLimit,
  } satisfies IShoppingMallCategoryTree.IRequest;

  const pageResult: IPageIShoppingMallCategoryTree.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 4. Validate pagination semantics.
  TestValidator.equals(
    "pagination current index should be 0 for first page",
    pagination.current,
    0,
  );

  TestValidator.equals(
    "pagination limit should equal requested limit",
    pagination.limit,
    requestedLimit,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // We created at least one category tree, so if search is not further filtered
  // by any field, records should be >= 1 and data length should be >= 1.
  TestValidator.predicate(
    "there should be at least one category tree in records",
    pagination.records >= 1,
  );

  TestValidator.predicate(
    "data array length should be at least 1",
    data.length >= 1,
  );

  // 5. Locate the created tree in the search results by code.
  const foundSummary = data.find(
    (summary) => summary.code === createdTree.code,
  );

  TestValidator.predicate(
    "created category tree should appear in search results",
    foundSummary !== undefined,
  );

  if (foundSummary !== undefined) {
    // Validate key summary fields.
    const summaryIdAsString = foundSummary.id satisfies string as string;
    TestValidator.equals(
      "summary id should match created tree id",
      summaryIdAsString,
      createdTree.id,
    );

    TestValidator.equals(
      "summary code should match created tree code",
      foundSummary.code,
      createdTree.code,
    );

    TestValidator.equals(
      "summary name should match created tree name",
      foundSummary.name,
      createdTree.name,
    );

    TestValidator.equals(
      "summary active flag should match created tree active flag",
      foundSummary.active,
      createdTree.active,
    );

    // Optional fields: description and default_locale
    if (createBody.description !== undefined) {
      TestValidator.equals(
        "summary description should match created tree description",
        foundSummary.description ?? undefined,
        createBody.description,
      );
    }

    if (createBody.defaultLocale !== undefined) {
      TestValidator.equals(
        "summary default locale should match created tree defaultLocale",
        foundSummary.default_locale ?? undefined,
        createBody.defaultLocale,
      );
    }
  }
}
