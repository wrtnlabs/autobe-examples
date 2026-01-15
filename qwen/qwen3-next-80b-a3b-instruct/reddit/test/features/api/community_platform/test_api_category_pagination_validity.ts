import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductCategory";
export async function test_api_category_pagination_validity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Validate the pagination functionality using the minimal data available
  // Test with the maximum limit allowed (100) to verify it works
  const firstPage = await api.functional.communityPlatform.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    },
  );
  typia.assert(firstPage);
  // Verify that the response matches the expected structure
  TestValidator.equals(
    "first page current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit is 100",
    firstPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "first page has at least 0 records",
    firstPage.data.length >= 0,
  );
  TestValidator.predicate(
    "first page has at most 100 records",
    firstPage.data.length <= 100,
  );
  // Test that page and limit conform to their constraints
  TestValidator.predicate(
    "pagination current is non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    firstPage.pagination.pages > 0,
  );
  // Validate the data array structure
  TestValidator.predicate("data is an array", Array.isArray(firstPage.data));
  if (firstPage.data.length > 0) {
    // Validate first data element is ISummary
    const firstItem = firstPage.data[0];
    TestValidator.predicate(
      "first item has id",
      typeof firstItem.id === "string",
    );
    TestValidator.predicate(
      "first item has name",
      typeof firstItem.name === "string",
    );
    TestValidator.predicate(
      "first item has slug",
      typeof firstItem.slug === "string",
    );
    TestValidator.predicate(
      "first item has active",
      typeof firstItem.active === "boolean",
    );
    TestValidator.predicate(
      "first item has created_at",
      firstItem.created_at !== undefined,
    );
    TestValidator.predicate(
      "first item has path",
      typeof firstItem.path === "string",
    );
    TestValidator.predicate(
      "first item has channel_id",
      typeof firstItem.channel_id === "string",
    );
    TestValidator.predicate(
      "first item has section_id",
      typeof firstItem.section_id === "string",
    );
  }
  // Test limit enforces max 100 items per page
  const pageWithLimit150 =
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 1,
        limit: 150,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    });
  typia.assert(pageWithLimit150);
  TestValidator.equals(
    "limit capped at 100",
    pageWithLimit150.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "response has at most 100 records",
    pageWithLimit150.data.length <= 100,
  );
  // Test page validation - negative page number should fail
  await TestValidator.error("negative page should fail", async () => {
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: -1,
        limit: 100,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    });
  });
  // Test page validation - zero page number should fail
  await TestValidator.error("zero page should fail", async () => {
    await api.functional.communityPlatform.categories.index(connection, {
      body: {
        page: 0,
        limit: 100,
      } satisfies ICommunityPlatformProductCategory.IRequest,
    });
  });
}
