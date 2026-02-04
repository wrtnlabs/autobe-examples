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
export async function test_api_section_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Create 15 test sections with timestamp-based names for predictable ordering
  // We'll create them sequentially to ensure different createdAt values
  const createdSections: IShoppingMallSection[] = [];
  for (let i = 0; i < 15; i++) {
    // Wait a brief moment between creations to ensure different createdAt timestamps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const section = await generate_random_shopping_mall_admin_sections_create(
      adminConnection,
      {
        body: {
          name: `Section ${i + 1}`,
          description: `Description for section ${i + 1}`,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
    createdSections.push(section);
  }
  // Create footer section for additional test data
  const footerSection =
    await generate_random_shopping_mall_admin_sections_create(adminConnection, {
      body: {
        name: "Footer Section",
        description: "Footer section data",
      } satisfies IShoppingMallSection.ICreate,
    });
  createdSections.push(footerSection);
  // Test default pagination with page=1, limit=10 (should return first 10 sections ordered by createdAt DESC)
  const defaultResponse =
    await api.functional.shoppingMall.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "default page number",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 10);
  TestValidator.equals(
    "default records",
    defaultResponse.pagination.records,
    16,
  );
  TestValidator.equals("default pages", defaultResponse.pagination.pages, 2); // ceil(16/10)
  // Validate results are ordered by createdAt DESC (newest first)
  // We created sections in order Section 1 to Section 15 + Footer
  // So the first section should be Footer (last created), then Section 15, then Section 14, etc.
  const expectedFirstSectionName = "Footer Section";
  TestValidator.equals(
    "first section is latest created",
    defaultResponse.data[0].name,
    expectedFirstSectionName,
  );
  // Verify the ordering by checking our created sequence
  // The sections in our createdSections array are ordered from oldest to newest
  // Default response should have the newest section first
  // Since 'id' property does not exist on IShoppingMallSection, we use 'name' to verify ordering
  const lastCreatedSection = createdSections[createdSections.length - 1];
  TestValidator.equals(
    "first section matches last created",
    defaultResponse.data[0].name,
    lastCreatedSection.name,
  );
  // Test pagination with page=2
  const page2Response = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(page2Response);
  // Validate page 2 metadata
  TestValidator.equals("page 2 number", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 16);
  TestValidator.equals("page 2 pages", page2Response.pagination.pages, 2);
  // Validate page 2 contains remaining sections
  const remainingSectionsCount = 16 - 10;
  TestValidator.equals(
    "page 2 data count",
    page2Response.data.length,
    remainingSectionsCount,
  );
  // Validate that page 2 has the next 6 sections in descending order
  const page2ExpectedName = "Section 15";
  TestValidator.equals(
    "first item in page 2",
    page2Response.data[0].name,
    page2ExpectedName,
  );
  // Test pagination with limit=5
  const limit5Response = await api.functional.shoppingMall.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(limit5Response);
  // Validate limit=5 metadata
  TestValidator.equals(
    "limit 5 page number",
    limit5Response.pagination.current,
    1,
  );
  TestValidator.equals("limit 5 limit", limit5Response.pagination.limit, 5);
  TestValidator.equals(
    "limit 5 records",
    limit5Response.pagination.records,
    16,
  );
  TestValidator.equals("limit 5 pages", limit5Response.pagination.pages, 4); // ceil(16/5)
  // Validate limit=5 results
  TestValidator.equals("limit 5 data count", limit5Response.data.length, 5);
  // Test pagination with limit=5, page=4
  const currentPage4limit5Response =
    await api.functional.shoppingMall.admin.sections.index(adminConnection, {
      body: {
        page: 4,
        limit: 5,
      } satisfies IShoppingMallSection.IRequest,
    });
  typia.assert(currentPage4limit5Response);
  // Validate page 4, limit 5 metadata
  TestValidator.equals(
    "page 4 limit 5 page number",
    currentPage4limit5Response.pagination.current,
    4,
  );
  TestValidator.equals(
    "page 4 limit 5 limit",
    currentPage4limit5Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 4 limit 5 records",
    currentPage4limit5Response.pagination.records,
    16,
  );
  TestValidator.equals(
    "page 4 limit 5 pages",
    currentPage4limit5Response.pagination.pages,
    4,
  );
  // Validate last page has correct number of elements
  const expectedLastPageLength = 16 - (4 - 1) * 5; // 16 - 15 = 1
  TestValidator.equals(
    "page 4 limit 5 data count",
    currentPage4limit5Response.data.length,
    expectedLastPageLength,
  );
  // Find the original section with oldest created timestamp
  // In our creation, the first created is Section 1, which should be last in the sorted list
  const oldestSection = createdSections[0];
  // Validate that the last item in the last page is the oldest section
  // Since 'id' property does not exist on IShoppingMallSection, use 'name' for comparison
  const lastSectionInLastPage = currentPage4limit5Response.data[0];
  TestValidator.equals(
    "last section is oldest created",
    lastSectionInLastPage.name,
    oldestSection.name,
  );
  // Validate data structure of returned sections
  // Verify all returned sections have the correct structure of IShoppingMallSection.ISummary
  for (const section of [
    ...defaultResponse.data,
    ...page2Response.data,
    ...limit5Response.data,
    ...currentPage4limit5Response.data,
  ]) {
    // Successfully validating existing properties: name and description
    TestValidator.predicate(
      "section has name",
      typeof section.name === "string" && section.name.length > 0,
    );
    TestValidator.predicate(
      "section has description",
      typeof section.description === "string" && section.description.length > 0,
    );
    // Removed 'section.id' validation since it doesn't exist on IShoppingMallSection
    // The original error was correctly identified as property 'id' doesn't exist.
  }
  // Test sort by createdAt DESC (default) across whole dataset
  const fullSortedResponse =
    await api.functional.shoppingMall.admin.sections.index(adminConnection, {
      body: {
        page: 1,
        limit: 16,
      } satisfies IShoppingMallSection.IRequest,
    });
  typia.assert(fullSortedResponse);
  // Validate that results are sorted by createdAt DESC (newest first)
  // Our creation order: Section 1, Section 2, ..., Section 15, Footer (last created)
  // So sorting DESC should be: Footer, Section 15, Section 14, ..., Section 1
  for (let i = 0; i < fullSortedResponse.data.length; i++) {
    const section = fullSortedResponse.data[i];
    if (i === 0) {
      TestValidator.equals(
        "first section is Footer",
        section.name,
        "Footer Section",
      );
    } else if (i <= 15) {
      TestValidator.equals(
        `section at position ${i}`,
        section.name,
        `Section ${16 - i}`,
      );
    }
  }
  // Validate data consistency - no duplicates
  const allData = [...fullSortedResponse.data];
  // Since 'id' doesn't exist, we use name for duplicate detection
  // We assume name uniqueness for test purposes
  const uniqueNames = new Set(allData.map((s) => s.name));
  TestValidator.equals(
    "no duplicate section names",
    uniqueNames.size,
    allData.length,
  );
  // Validate that the total number of sections matches the records in the response
  TestValidator.equals(
    "total sections match pagination records",
    allData.length,
    fullSortedResponse.pagination.records,
  );
}