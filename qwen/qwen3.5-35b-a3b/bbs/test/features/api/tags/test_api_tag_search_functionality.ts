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

export async function test_api_tag_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Get total tags without search for comparison
  const totalTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(totalTags);
  // 1. Test search with "economy" - case-insensitive pattern matching
  const economyResults = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { search: "economy" } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(economyResults);
  TestValidator.equals(
    "economy search returns data",
    economyResults.data.length > 0,
    true,
  );
  // Verify all returned tag names contain "economy" (case-insensitive)
  for (const tag of economyResults.data) {
    TestValidator.predicate(
      "each economy tag contains search term",
      tag.name.toLowerCase().includes("economy"),
    );
  }
  // Verify alphabetical sorting is maintained
  for (let i = 1; i < economyResults.data.length; i++) {
    TestValidator.predicate(
      "tags are sorted alphabetically",
      economyResults.data[i - 1].name <= economyResults.data[i].name,
    );
  }
  // Verify pagination reflects filtered count, not total
  TestValidator.equals(
    "pagination records matches filtered count",
    economyResults.pagination.records,
    economyResults.data.length,
  );
  TestValidator.notEquals(
    "pagination reflects filtered results",
    economyResults.pagination.records,
    totalTags.pagination.records,
  );
  // 2. Test search with "policy" - verify different set of tags
  const policyResults = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { search: "policy" } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(policyResults);
  TestValidator.equals(
    "policy search returns data",
    policyResults.data.length > 0,
    true,
  );
  // Verify all returned tag names contain "policy" (case-insensitive)
  for (const tag of policyResults.data) {
    TestValidator.predicate(
      "each policy tag contains search term",
      tag.name.toLowerCase().includes("policy"),
    );
  }
  // Verify alphabetical sorting
  for (let i = 1; i < policyResults.data.length; i++) {
    TestValidator.predicate(
      "policy tags are sorted alphabetically",
      policyResults.data[i - 1].name <= policyResults.data[i].name,
    );
  }
  // 3. Test search with "xyz" (non-existent term) - empty results
  const noResults = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { search: "xyz" } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(noResults);
  TestValidator.equals(
    "non-existent search returns empty data",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search pagination records is 0",
    noResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent search pagination pages is 0",
    noResults.pagination.pages,
    0,
  );
  // 4. Test search with "tax" - verify tags containing "tax" are returned
  const taxResults = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: { search: "tax" } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(taxResults);
  // Verify alphabetical sorting
  for (let i = 1; i < taxResults.data.length; i++) {
    TestValidator.predicate(
      "tax tags are sorted alphabetically",
      taxResults.data[i - 1].name <= taxResults.data[i].name,
    );
  }
  // 5. Test search with "e" (single character) - verify results are returned
  const singleCharResults =
    await api.functional.economicPoliticalBoard.tags.index(connection, {
      body: { search: "e" } satisfies IEconomicPoliticalBoardTag.IRequest,
    });
  typia.assert(singleCharResults);
  TestValidator.equals(
    "single character search returns data",
    singleCharResults.data.length > 0,
    true,
  );
  // 6. Test search with very long term (>100 chars) - verify API rejects it
  const longSearchTerm =
    "verylongtagnameexceedingmaximumlimitallowedbythevalidatorandthensomeextra";
  await TestValidator.httpError(
    "long search term returns 400",
    400,
    async () => {
      await api.functional.economicPoliticalBoard.tags.index(connection, {
        body: {
          search: longSearchTerm,
        } satisfies IEconomicPoliticalBoardTag.IRequest,
      });
    },
  );
}
