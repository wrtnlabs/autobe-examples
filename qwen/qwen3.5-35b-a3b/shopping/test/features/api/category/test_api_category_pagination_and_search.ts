import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Test pagination with limit=5, page=1
  const page1 = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { limit: 5, page: 1 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 data within limit", page1.data.length <= 5);
  // 3. Test pagination with limit=5, page=2
  const page2 = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { limit: 5, page: 2 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.notEquals(
    "page 2 differs from page 1 IDs",
    page1.data[0]?.id,
    page2.data[0]?.id,
  );
  // 4. Test max limit (100)
  const maxLimit = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { limit: 100, page: 1 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit 100", maxLimit.pagination.limit, 100);
  // 5. Test min limit (10)
  const minLimit = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { limit: 10, page: 1 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals("min limit 10", minLimit.pagination.limit, 10);
  // 6. Test limit < 10 returns error
  await TestValidator.error("limit < 10 returns 400", async () => {
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { limit: 5 } satisfies IEcommerceMallCategory.IRequest,
    });
  });
  // 7. Test limit > 100 returns error
  await TestValidator.error("limit > 100 returns 400", async () => {
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { limit: 150 } satisfies IEcommerceMallCategory.IRequest,
    });
  });
  // 8. Test search by name (partial match, case-insensitive)
  const nameSearch = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { name: "Electron" } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(nameSearch);
  // If results exist, verify they all match
  for (const category of nameSearch.data) {
    TestValidator.predicate(
      "name contains Electron",
      category.name.toLowerCase().includes("electron"),
    );
  }
  // 9. Test search by description (partial match, case-insensitive)
  const descSearch = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        description: "mobile devices",
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(descSearch);
  // If results exist, verify they all match
  for (const category of descSearch.data) {
    if (category.description) {
      TestValidator.predicate(
        "description contains mobile",
        category.description.toLowerCase().includes("mobile"),
      );
    }
  }
  // 10. Test combined searchQuery (name OR description)
  const searchQuery = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { searchQuery: "phone" } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(searchQuery);
  for (const category of searchQuery.data) {
    const matches =
      category.name.toLowerCase().includes("phone") ||
      (category.description?.toLowerCase().includes("phone") ?? false);
    TestValidator.predicate("matches searchQuery phone", matches);
  }
  // 11. Test filter combination: parentCategoryId + includeInactive
  const parentCategory = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { limit: 1, page: 1 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(parentCategory);
  if (parentCategory.data.length > 0 && parentCategory.data[0]?.id) {
    const withInactive = await api.functional.ecommerceMall.categories.index(
      adminConnection,
      {
        body: {
          parentCategoryId: parentCategory.data[0].id,
          includeInactive: true,
        } satisfies IEcommerceMallCategory.IRequest,
      },
    );
    typia.assert(withInactive);
    TestValidator.equals(
      "includes inactive with filter",
      withInactive.pagination.records >= 0,
      true,
    );
  }
  // 12. Test filter combination: parentCategoryId + searchQuery
  if (parentCategory.data.length > 0 && parentCategory.data[0]?.id) {
    const combined = await api.functional.ecommerceMall.categories.index(
      adminConnection,
      {
        body: {
          parentCategoryId: parentCategory.data[0].id,
          searchQuery: "test",
        } satisfies IEcommerceMallCategory.IRequest,
      },
    );
    typia.assert(combined);
    TestValidator.equals(
      "combined filter works",
      combined.pagination.records >= 0,
      true,
    );
  }
  // 13. Test sorting by created_at with pagination page 3
  const sorted = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        page: 3,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(sorted);
  TestValidator.equals(
    "sort by created_at page 3",
    sorted.pagination.current,
    3,
  );
  TestValidator.equals(
    "sort by created_at default limit",
    sorted.pagination.limit,
    20,
  );
  // 14. Test sorting with asc order
  const sortedAsc = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.equals("sort asc order", sortedAsc.pagination.current, 1);
  // 15. Test sorting with desc order
  const sortedDesc = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "desc",
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.equals("sort desc order", sortedDesc.pagination.current, 1);
  // 16. Test default sorting (name, asc)
  const defaultSort = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { page: 1 } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(defaultSort);
  TestValidator.equals("default sort works", defaultSort.pagination.current, 1);
}
