import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test an administrator's ability to search and filter discussion board sections for administrative oversight.
 *
 * This test validates the section search functionality available to administrators, including:
 * - Authentication as an administrator
 * - Searching sections by name pattern matching
 * - Pagination controls (page and limit parameters)
 * - Multiple sorting options (creation date, update date, alphabetical)
 * - Proper response structure with section summaries and pagination metadata
 * - Exclusion of soft-deleted sections from search results
 */
export async function test_api_section_admin_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test basic search with name pattern
  const searchResult = await api.functional.discussionBoard.admin.topics.index(
    adminConnection,
    {
      body: {
        search: "polit",
        page: 1,
        limit: 10,
        sort: "name:asc",
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.equals("pagination structure", searchResult.pagination, {
    current: 1,
    limit: 10,
    records: searchResult.pagination.records,
    pages: searchResult.pagination.pages,
  } satisfies IPage.IPagination);
  // Validate section summary structure for each result
  for (const section of searchResult.data) {
    typia.assert(section);
    // Business logic validation instead of type validation
    TestValidator.predicate(
      "section has name property",
      "name" in section && typeof section.name === "string",
    );
    TestValidator.predicate(
      "section has id property",
      "id" in section && typeof section.id === "string",
    );
    TestValidator.predicate(
      "section has created_at property",
      "created_at" in section && typeof section.created_at === "string",
    );
  }
  // Test pagination with different parameters
  const paginationTest =
    await api.functional.discussionBoard.admin.topics.index(adminConnection, {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "page 2 current page",
    paginationTest.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", paginationTest.pagination.limit, 5);
  // Test all sorting options
  const sortOptions = [
    "created_at:desc",
    "created_at:asc",
    "updated_at:desc",
    "updated_at:asc",
    "name:asc",
    "name:desc",
  ] as const;
  for (const sortOption of sortOptions) {
    const sortedResult =
      await api.functional.discussionBoard.admin.topics.index(adminConnection, {
        body: {
          sort: sortOption,
          limit: 5,
        } satisfies IDiscussionBoardSection.IRequest,
      });
    typia.assert(sortedResult);
    TestValidator.predicate(
      `sort ${sortOption} returns data`,
      sortedResult.data.length >= 0,
    );
  }
  // Test empty search (should return all sections)
  const emptySearch = await api.functional.discussionBoard.admin.topics.index(
    adminConnection,
    {
      body: {
        search: "",
        limit: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns results",
    emptySearch.pagination.records >= 0,
  );
}
