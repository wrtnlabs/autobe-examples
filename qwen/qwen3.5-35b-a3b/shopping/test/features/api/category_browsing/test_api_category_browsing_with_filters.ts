import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_browsing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost/test",
      referrer: "http://localhost/login",
    },
  });
  typia.assert(adminAuth);
  // 2. Create top-level category for hierarchy testing
  const topLevelCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
          parent_category_id: null,
        },
      },
    );
  typia.assert(topLevelCategory);
  // 3. Create subcategories under the top-level category
  const subcategory1 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Phones",
          description: "Mobile phones and accessories",
          parent_category_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory1);
  const subcategory2 =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Portable computers",
          parent_category_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory2);
  // 4. Test default listing (all active categories)
  const defaultResponse = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "current page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", defaultResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records is positive number",
    defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages is positive number",
    defaultResponse.pagination.pages > 0,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultResponse.data));
  const namesInDefault = defaultResponse.data.map((c) => c.name);
  const sortedNames = [...namesInDefault].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "default sorting by name ascending",
    namesInDefault,
    sortedNames,
  );
  // Verify required fields in each category
  defaultResponse.data.forEach((category) => {
    TestValidator.predicate(
      `category has id field ${category.name}`,
      category.id !== undefined,
    );
    TestValidator.predicate(
      `category has name field ${category.name}`,
      category.name !== undefined,
    );
    TestValidator.predicate(
      `category has isLeaf field ${category.name}`,
      category.isLeaf !== undefined,
    );
    TestValidator.predicate(
      `category has createdAt field ${category.name}`,
      category.createdAt !== undefined,
    );
    TestValidator.predicate(
      `category has deletedAt field ${category.name}`,
      category.deletedAt !== undefined,
    );
  });
  // 5. Test hierarchy filtering - top-level categories only
  const topLevelResponse = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { parentCategoryId: undefined },
    },
  );
  typia.assert(topLevelResponse);
  TestValidator.equals(
    "no subcategories in top-level response",
    topLevelResponse.data.some((c) => c.parent !== null),
    false,
  );
  TestValidator.predicate(
    "top-level category exists",
    topLevelResponse.data.some((c) => c.id === topLevelCategory.id),
  );
  // 6. Test hierarchy filtering - subcategories only
  const subcategoryResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { parentCategoryId: topLevelCategory.id },
    });
  typia.assert(subcategoryResponse);
  TestValidator.equals(
    "subcategory response contains correct categories",
    subcategoryResponse.data.map((c) => c.id).sort(),
    [subcategory1.id, subcategory2.id].sort(),
  );
  const hasCorrectParent = subcategoryResponse.data.every(
    (c) => c.parent?.id === topLevelCategory.id,
  );
  TestValidator.predicate(
    "subcategory parent references are correct",
    hasCorrectParent,
  );
  // 7. Test pagination - page 2 with limit 10
  const page2Response = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { page: 2, limit: 10 },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 metadata current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 metadata limit",
    page2Response.pagination.limit,
    10,
  );
  // 8. Test sorting by created_at descending
  const descendingSortResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { sortBy: "created_at", sortOrder: "desc" },
    });
  typia.assert(descendingSortResponse);
  const sortedByDateDesc = descendingSortResponse.data;
  for (let i = 0; i < sortedByDateDesc.length - 1; i++) {
    const date1 = new Date(sortedByDateDesc[i].createdAt);
    const date2 = new Date(sortedByDateDesc[i + 1].createdAt);
    TestValidator.predicate(
      `createdAt descending at index ${i}`,
      date1 >= date2,
    );
  }
  // 9. Test sorting by name ascending (explicit)
  const nameAscendingResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { sortBy: "name", sortOrder: "asc" },
    });
  typia.assert(nameAscendingResponse);
  const sortedByNameAsc = nameAscendingResponse.data;
  for (let i = 0; i < sortedByNameAsc.length - 1; i++) {
    const comparison = sortedByNameAsc[i].name.localeCompare(
      sortedByNameAsc[i + 1].name,
    );
    TestValidator.predicate(`name ascending at index ${i}`, comparison <= 0);
  }
  // 10. Test includeInactive flag
  const inactiveResponse = await api.functional.ecommerceMall.categories.index(
    adminConnection,
    {
      body: { includeInactive: true },
    },
  );
  typia.assert(inactiveResponse);
  // Verify response structure for inactive categories
  TestValidator.predicate(
    "inactive response has valid pagination",
    inactiveResponse.pagination.records >= 0,
  );
  // 11. Test name filter (partial match)
  const nameFilterResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { name: "elec" },
    });
  typia.assert(nameFilterResponse);
  const allMatchNameFilter = nameFilterResponse.data.every((c) =>
    c.name.toLowerCase().includes("elec".toLowerCase()),
  );
  TestValidator.predicate("name filter case-insensitive", allMatchNameFilter);
  // 12. Test searchQuery (combined search)
  const searchQueryResponse =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: { searchQuery: "device" },
    });
  typia.assert(searchQueryResponse);
  const allMatchSearchQuery = searchQueryResponse.data.every(
    (c) =>
      c.name.toLowerCase().includes("device".toLowerCase()) ||
      (c.description &&
        c.description.toLowerCase().includes("device".toLowerCase())),
  );
  TestValidator.predicate(
    "searchQuery matches name or description",
    allMatchSearchQuery,
  );
}