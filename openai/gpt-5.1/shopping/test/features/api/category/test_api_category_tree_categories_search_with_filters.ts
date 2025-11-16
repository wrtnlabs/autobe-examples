import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_tree_categories_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authorized session (token is set on connection).
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin-example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "platform admin join returns active admin",
    admin.isActive === true,
  );

  // 2. Create a category tree this admin will manage.
  const treeCode = `tree-${RandomGenerator.alphaNumeric(12)}`;
  const treeCreateBody = {
    code: treeCode,
    name: `Category Tree ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeCreateBody,
      },
    );
  typia.assert(tree);
  TestValidator.equals(
    "created tree code should match request code",
    tree.code,
    treeCode,
  );

  // Helper to validate generic pagination invariants for any category list.
  const assertPaginationInvariants = (
    title: string,
    page: IPageIShoppingMallCategory.ISummary,
  ): void => {
    typia.assert<IPageIShoppingMallCategory.ISummary>(page);

    const pagination = page.pagination;
    const data = page.data;

    // Basic numeric invariants.
    TestValidator.predicate(
      `${title} - pagination.current should be >= 0`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination.limit should be >= 0`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination.records should be >= 0`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} - pagination.pages should be >= 0`,
      pagination.pages >= 0,
    );

    // Data length vs limit.
    TestValidator.predicate(
      `${title} - data length should be <= limit`,
      data.length <= pagination.limit,
    );

    // Empty pages invariants: when no records, pages must be 0 and data empty.
    if (pagination.records === 0) {
      TestValidator.equals(
        `${title} - when no records, pages should be 0`,
        pagination.pages,
        0,
      );
      TestValidator.equals(
        `${title} - when no records, data should be empty`,
        data.length,
        0,
      );
    }
  };

  // 3. First search: no keyword/parent filter, but explicit isActive=null and basic pagination.
  const firstSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    sortKey: "name",
    sortOrder: "asc",
    keyword: undefined,
    treeCode: undefined,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
    isActive: null,
  } satisfies IShoppingMallCategory.IRequest;

  const firstResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
      connection,
      {
        categoryTreeCode: tree.code,
        body: firstSearchBody,
      },
    );
  assertPaginationInvariants("first search", firstResult);

  // When data is non-empty, ensure every category belongs to the created tree.
  for (const category of firstResult.data) {
    typia.assert<IShoppingMallCategory.ISummary>(category);
    TestValidator.equals(
      "category tree code should match requested tree code in first search",
      category.categoryTree.code,
      tree.code,
    );
  }

  // 4. Second search: use a random keyword that is very unlikely to match.
  const unlikelyKeyword = RandomGenerator.paragraph({ sentences: 1 });
  const secondSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sortKey: "name",
    sortOrder: "asc",
    keyword: unlikelyKeyword,
    treeCode: undefined,
    parentCategoryCode: undefined,
    minDepth: undefined,
    maxDepth: undefined,
    isActive: null,
  } satisfies IShoppingMallCategory.IRequest;

  const secondResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
      connection,
      {
        categoryTreeCode: tree.code,
        body: secondSearchBody,
      },
    );
  assertPaginationInvariants("second search (unlikely keyword)", secondResult);

  // 5. Third search: demonstrate minDepth/maxDepth and parentCategoryCode filters.
  const thirdSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sortKey: "name",
    sortOrder: "asc",
    keyword: undefined,
    treeCode: undefined,
    parentCategoryCode: "some-parent-code",
    minDepth: 1 as number & tags.Type<"int32">,
    maxDepth: 3 as number & tags.Type<"int32">,
    isActive: true,
  } satisfies IShoppingMallCategory.IRequest;

  const thirdResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.index(
      connection,
      {
        categoryTreeCode: tree.code,
        body: thirdSearchBody,
      },
    );
  assertPaginationInvariants(
    "third search (depth and parent filter)",
    thirdResult,
  );

  // Again, when data is non-empty, ensure categories are still scoped to the tree.
  for (const category of thirdResult.data) {
    typia.assert<IShoppingMallCategory.ISummary>(category);
    TestValidator.equals(
      "category tree code should match requested tree code in third search",
      category.categoryTree.code,
      tree.code,
    );
  }
}
