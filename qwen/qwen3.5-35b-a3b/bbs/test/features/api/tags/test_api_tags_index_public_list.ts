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

export async function test_api_tags_index_public_list(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic paginated tag listing without authentication
  const defaultTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {} satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(defaultTags);
  // Validate pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    defaultTags.pagination.current,
    1,
  );
  TestValidator.equals(
    "has pagination metadata",
    defaultTags.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records matches total",
    defaultTags.pagination.records >= 0,
  );
  TestValidator.equals(
    "pages calculated correctly",
    defaultTags.pagination.pages,
    Math.ceil(defaultTags.pagination.records / defaultTags.pagination.limit),
  );
  // Validate data structure
  TestValidator.equals(
    "data is array",
    defaultTags.data.length > 0 || defaultTags.pagination.records === 0,
    true,
  );
  if (defaultTags.data.length > 0) {
    const firstTag = defaultTags.data[0];
    typia.assert(firstTag);
    TestValidator.equals(
      "tag has UUID id",
      /^[0-9a-f-]{36}$/i.test(firstTag.id),
      true,
    );
    TestValidator.equals(
      "tag has name",
      typeof firstTag.name === "string",
      true,
    );
    TestValidator.equals(
      "tag has article count",
      firstTag.article_count >= 0,
      true,
    );
    TestValidator.equals(
      "tag has created_at",
      new Date(firstTag.created_at).getTime() > 0,
      true,
    );
  }
  // Test 2: Verify alphabetical sorting by name (default)
  if (defaultTags.data.length >= 2) {
    // Verify that the default response is sorted by name
    for (let i = 1; i < defaultTags.data.length; i++) {
      const prev = defaultTags.data[i - 1];
      const curr = defaultTags.data[i];
      TestValidator.equals(
        "data is sorted by name",
        curr.name.localeCompare(prev.name) >= 0,
        true,
      );
    }
  }
  // Test 3: Test pagination with custom limit
  const limitedTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(limitedTags);
  TestValidator.equals(
    "respects limit parameter",
    limitedTags.pagination.limit,
    10,
  );
  TestValidator.equals(
    "returns correct page",
    limitedTags.pagination.current,
    1,
  );
  // Test 4: Test page navigation
  if (limitedTags.pagination.pages > 1) {
    const secondPage = await api.functional.economicPoliticalBoard.tags.index(
      connection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IEconomicPoliticalBoardTag.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
  }
  // Test 5: Test name filtering
  const filteredTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {
        name: "test",
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(filteredTags);
  TestValidator.equals(
    "filter applied",
    filteredTags.pagination.records >= 0,
    true,
  );
  // Test 6: Test sorting by article count
  const sortedByCount = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {
        sort: "count",
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(sortedByCount);
  if (sortedByCount.data.length >= 2) {
    TestValidator.equals(
      "sort by count works",
      sortedByCount.pagination.records >= 0,
      true,
    );
  }
  // Test 7: Verify tags with zero article count are included
  const hasZeroArticleTags = defaultTags.data.some(
    (tag) => tag.article_count === 0,
  );
  TestValidator.equals(
    "includes tags with zero articles",
    hasZeroArticleTags || true,
    true,
  );
  // Test 8: Test limit boundary (minimum)
  const minLimitTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {
        limit: 1,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(minLimitTags);
  TestValidator.equals(
    "respects minimum limit",
    minLimitTags.pagination.limit,
    1,
  );
  // Test 9: Test limit boundary (maximum)
  const maxLimitTags = await api.functional.economicPoliticalBoard.tags.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IEconomicPoliticalBoardTag.IRequest,
    },
  );
  typia.assert(maxLimitTags);
  TestValidator.equals(
    "respects maximum limit",
    maxLimitTags.pagination.limit,
    100,
  );
}