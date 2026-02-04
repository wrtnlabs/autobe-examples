import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { generate_random_shopping_mall_admin_sections_create } from "../../../generate/generate_random_shopping_mall_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_list_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/",
      referrer: "https://example.com/",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create test sections with searchable content and parent-child relationships
  const parent1 = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "All electronic devices and gadgets",
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(parent1);
  const parent2 = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Clothing",
        description: "Fashion and apparel for men and women",
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(parent2);
  // Create child sections with parent references using the parent IDs
  const child1 = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Smartphones",
        description: "Mobile phones and accessories",
        parentId: parent1.categoryId, // Establish parent-child relationship
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(child1);
  const child2 = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Men's Fashion",
        description: "Clothing for men",
        parentId: parent2.categoryId, // Establish parent-child relationship
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(child2);
  // Step 3: Test case-insensitive search on name with mixed case
  const searchResult1 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "SMARTPHONE",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult1);
  TestValidator.equals(
    "case-insensitive search returns 1 result for 'SMARTPHONE'",
    searchResult1.data.length,
    1,
  );
  TestValidator.equals(
    "search result name matches case-insensitively",
    searchResult1.data[0].name,
    "Smartphones",
  );
  TestValidator.equals(
    "search result description contains 'Mobile phones'",
    searchResult1.data[0].description,
    "Mobile phones and accessories",
  );
  // Step 4: Test case-insensitive search on description with mixed case
  const searchResult2 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "fAsHioN",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult2);
  TestValidator.equals(
    "case-insensitive search returns 1 result for 'fAsHioN'",
    searchResult2.data.length,
    1,
  );
  TestValidator.equals(
    "search result name matches case-insensitively",
    searchResult2.data[0].name,
    "Clothing",
  );
  TestValidator.equals(
    "search result description contains 'Fashion'",
    searchResult2.data[0].description,
    "Fashion and apparel for men and women",
  );
  // Step 5: Test parent-child hierarchy in search results
  const searchResult3 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "Smartphones",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult3);
  TestValidator.equals(
    "hierarchical search returns 1 result",
    searchResult3.data.length,
    1,
  );
  TestValidator.equals(
    "child section name is correct",
    searchResult3.data[0].name,
    "Smartphones",
  );
  TestValidator.equals(
    "child section has parent",
    searchResult3.data[0].parent !== null,
    true,
  );
  TestValidator.equals(
    "parent section name matches",
    searchResult3.data[0].parent?.name,
    "Electronics",
  );
  TestValidator.equals(
    "parent section description matches",
    searchResult3.data[0].parent?.description,
    "All electronic devices and gadgets",
  );
  // Step 6: Test search with partial match on name
  const searchResult4 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "Electro",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.equals(
    "search returns 1 result for 'Electro'",
    searchResult4.data.length,
    1,
  );
  TestValidator.equals(
    "search result name matches",
    searchResult4.data[0].name,
    "Electronics",
  );
  TestValidator.equals(
    "search result description contains 'Electronics'",
    searchResult4.data[0].description,
    "All electronic devices and gadgets",
  );
  // Step 7: Test search with partial match on description
  const searchResult5 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "apparel",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult5);
  TestValidator.equals(
    "search returns 1 result for 'apparel'",
    searchResult5.data.length,
    1,
  );
  TestValidator.equals(
    "search result name matches",
    searchResult5.data[0].name,
    "Clothing",
  );
  TestValidator.equals(
    "search result description contains 'apparel'",
    searchResult5.data[0].description,
    "Fashion and apparel for men and women",
  );
  // Step 8: Test search with multi-word phrase
  const searchResult6 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "kitchen appliance",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult6);
  TestValidator.equals(
    "search returns 1 result for 'kitchen appliance'",
    searchResult6.data.length,
    1,
  );
  TestValidator.equals(
    "search result name matches",
    searchResult6.data[0].name,
    "Home & Kitchen",
  );
  TestValidator.equals(
    "search result description contains 'kitchen appliance'",
    searchResult6.data[0].description,
    "Household items and kitchen appliances",
  );
  // Step 9: Test pagination - limit to 2 results on page 1
  const searchResult7 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "",
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult7);
  TestValidator.equals("page 1 has 2 results", searchResult7.data.length, 2);
  TestValidator.equals(
    "pagination limits to 2",
    searchResult7.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination has 4 total records",
    searchResult7.pagination.records,
    4,
  ); // Now 4 sections total
  TestValidator.equals(
    "pagination has 2 pages total",
    searchResult7.pagination.pages,
    2,
  );
  // Step 10: Test pagination - page 2 with limit of 2
  const searchResult8 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "",
        page: 2,
        limit: 2,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult8);
  TestValidator.equals("page 2 has 2 results", searchResult8.data.length, 2);
  TestValidator.equals(
    "pagination limits to 2",
    searchResult8.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination has 4 total records",
    searchResult8.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination has 2 pages total",
    searchResult8.pagination.pages,
    2,
  );
  // Step 11: Test no search term returns all
  const searchResult9 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: undefined,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult9);
  TestValidator.equals(
    "no search term returns all 4 sections",
    searchResult9.data.length,
    4,
  );
  // Step 12: Test non-existent search term returns empty array
  const searchResult10 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "nonexistent",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult10);
  TestValidator.equals(
    "nonexistent search returns 0 results",
    searchResult10.data.length,
    0,
  );
  // Step 13: Test default values (page=1, limit=10)
  const searchResult11 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "",
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult11);
  TestValidator.equals(
    "default page is 1",
    searchResult11.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 10",
    searchResult11.pagination.limit,
    10,
  );
  TestValidator.equals(
    "default search returns all",
    searchResult11.data.length,
    4,
  );
  // Step 14: Test search with no results in hierarchy
  const searchResult12 = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        search: "Electronics",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult12);
  TestValidator.equals(
    "search top-level returns 1 result",
    searchResult12.data.length,
    1,
  );
  TestValidator.equals(
    "parent section has no parent",
    searchResult12.data[0].parent === null,
    true,
  );
}
