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

export async function test_api_category_search_pagination_stability(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to gain authorization for category tree and category creation
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a category tree for this test
  const treeCode = `tree-pagination-${RandomGenerator.alphaNumeric(8)}`;
  const treeBody = {
    code: treeCode,
    name: "Pagination Stability Test Tree",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: treeBody },
    );
  typia.assert<IShoppingMallCategoryTree>(tree);
  TestValidator.equals(
    "created tree code should match request code",
    tree.code,
    treeCode,
  );

  // 3. Bulk-create categories within the tree
  const totalCategories = 25;

  for (let i = 0; i < totalCategories; i++) {
    const categoryBody = {
      code: `cat-${i.toString().padStart(3, "0")}`,
      name: `Category ${i.toString().padStart(3, "0")}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      displayOrder: i,
      isActive: true,
    } satisfies IShoppingMallCategory.ICreate;

    const category: IShoppingMallCategory =
      await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
        connection,
        {
          categoryTreeCode: tree.code,
          body: categoryBody,
        },
      );
    typia.assert<IShoppingMallCategory>(category);
  }

  // 4. Search categories with pagination (page 1, limit 10)
  const pageSize = 10;
  const firstRequestBody = {
    treeCode: tree.code,
    page: 1,
    limit: pageSize,
    sortKey: "displayOrder",
    sortOrder: "asc",
  } satisfies IShoppingMallCategory.IRequest;

  const firstPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: firstRequestBody,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(firstPage);

  const pagination: IPage.IPagination = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  const totalRecords = pagination.records;

  TestValidator.predicate(
    "total records should be at least number of created categories in this tree",
    totalRecords >= totalCategories,
  );

  // 5. Collect IDs from all pages to validate stability and uniqueness
  const seenIds = new Set<string>();
  const concatenatedIds: string[] = [];

  const ingestPage = (
    title: string,
    pageData: IPageIShoppingMallCategory.ISummary,
  ) => {
    for (const summary of pageData.data) {
      const id = summary.id;
      TestValidator.predicate(
        `${title} - category id should be unique across pages`,
        seenIds.has(id) === false,
      );
      seenIds.add(id);
      concatenatedIds.push(id);
    }
  };

  ingestPage("first page", firstPage);

  // 6. Fetch subsequent pages using same criteria
  const totalPages = pagination.pages;

  for (let pageIndex = 2; pageIndex <= totalPages; pageIndex++) {
    const requestBody = {
      treeCode: tree.code,
      page: pageIndex,
      limit: pageSize,
      sortKey: "displayOrder",
      sortOrder: "asc",
    } satisfies IShoppingMallCategory.IRequest;

    const pageResult: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.search.categories.index(connection, {
        body: requestBody,
      });
    typia.assert<IPageIShoppingMallCategory.ISummary>(pageResult);

    ingestPage(`page ${pageIndex}`, pageResult);

    if (seenIds.size >= totalRecords) {
      break;
    }
  }

  // 7. Ensure we've collected as many items as pagination.records reports
  TestValidator.equals(
    "number of unique seen category ids should match pagination.records",
    seenIds.size,
    totalRecords,
  );

  // 8. Verify global ordering consistency by comparing with a single large page
  const largePageRequestBody = {
    treeCode: tree.code,
    page: 1,
    limit: totalRecords,
    sortKey: "displayOrder",
    sortOrder: "asc",
  } satisfies IShoppingMallCategory.IRequest;

  const largePage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.search.categories.index(connection, {
      body: largePageRequestBody,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(largePage);

  const largePageIds = largePage.data.map((summary) => summary.id);

  TestValidator.equals(
    "concatenated ids across paged results should match single large page ids in the same order",
    concatenatedIds,
    largePageIds,
  );

  // 9. Sanity check: ensure no duplicates (Set size equals concatenated array length)
  TestValidator.equals(
    "set size and concatenated array length should match when no duplicates exist",
    seenIds.size,
    concatenatedIds.length,
  );
}
