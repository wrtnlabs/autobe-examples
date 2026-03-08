import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_listing_basic(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination (page=1, limit=50)
  const result1 = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(result1);
  // Verify pagination structure
  TestValidator.equals(
    "pagination metadata present",
    result1.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array present", result1.data !== undefined, true);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", result1.pagination.current, 1);
  TestValidator.equals("limit is 50 (default)", result1.pagination.limit, 50);
  // Verify records and pages calculation
  TestValidator.equals(
    "records matches data length",
    result1.pagination.records,
    result1.data.length,
  );
  const expectedPages =
    result1.pagination.records === 0
      ? 0
      : Math.ceil(result1.pagination.records / result1.pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    result1.pagination.pages,
    expectedPages,
  );
  // Verify all tags have required fields
  for (const tag of result1.data) {
    TestValidator.equals(
      "tag has valid uuid id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tag.id,
      ),
      true,
    );
    TestValidator.equals(
      "tag name pattern matches",
      /^[a-zA-Z0-9-]+$/.test(tag.name),
      true,
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      () => !isNaN(new Date(tag.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      () => !isNaN(new Date(tag.updated_at).getTime()),
    );
  }
  // Verify tags are sorted alphabetically by name (ascending)
  if (result1.data.length > 1) {
    const names = result1.data.map((t) => t.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    TestValidator.equals(
      "tags sorted alphabetically by name",
      names,
      sortedNames,
    );
  }
  // Test 2: Maximum limit (200)
  const result2 = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { limit: 200 },
    },
  );
  typia.assert(result2);
  TestValidator.equals("limit is 200", result2.pagination.limit, 200);
  // Should return same or more tags than default limit
  TestValidator.predicate(
    "200 limit returns at least as many tags",
    () => result2.data.length >= result1.data.length,
  );
  // Test 3: Page 2 pagination
  const result3 = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(result3);
  TestValidator.equals("page 2 returns page=2", result3.pagination.current, 2);
  TestValidator.equals("page 2 returns limit=2", result3.pagination.limit, 2);
  // Verify no overlap between page 1 and page 2 with limit=2
  if (result1.data.length >= 4) {
    const page1Ids = result1.data.slice(0, 2).map((t) => t.id);
    const page2Ids = result3.data.map((t) => t.id);
    TestValidator.predicate("page 2 has no overlap with page 1", () =>
      page1Ids.every((id) => !page2Ids.includes(id)),
    );
  }
  // Test 4: Search functionality
  const searchTag = result1.data[0]?.name;
  if (searchTag) {
    const result4 = await api.functional.economicPoliticalBoard.tags.index(
      connection,
      {
        body: { search: searchTag satisfies string as string },
      },
    );
    typia.assert(result4);
    // All returned tags should contain the search term
    for (const tag of result4.data) {
      TestValidator.predicate("tag name contains search term", () =>
        tag.name.toLowerCase().includes(searchTag.toLowerCase()),
      );
    }
  }
  // Test 5: Empty result pagination
  const result5 = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { page: 999, limit: 10 },
    },
  );
  typia.assert(result5);
  TestValidator.equals(
    "out of range page returns empty data",
    result5.data.length,
    0,
  );
  TestValidator.equals(
    "out of range page still has pagination metadata",
    result5.pagination.current,
    999,
  );
}