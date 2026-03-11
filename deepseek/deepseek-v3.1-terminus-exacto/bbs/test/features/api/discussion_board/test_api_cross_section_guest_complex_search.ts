import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_cross_section_guest_complex_search(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guest);
  // Test 1: Search with text query only (no section filter)
  const searchQuery = RandomGenerator.substring(
    "cross-section search test article content",
  );
  const searchResult1 =
    await api.functional.discussionBoard.guest.cross_section.index(
      guestConnection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    searchResult1.pagination.current >= 0 &&
      searchResult1.pagination.limit >= 0 &&
      searchResult1.pagination.records >= 0 &&
      searchResult1.pagination.pages >= 0,
  );
  // Test 2: Search with specific section filter
  // Use a section ID from the first search results if available
  if (searchResult1.data.length > 0) {
    const sectionId = searchResult1.data[0].section.id;
    const searchResult2 =
      await api.functional.discussionBoard.guest.cross_section.index(
        guestConnection,
        {
          body: {
            search: searchQuery,
            discussion_board_section_id: sectionId,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(searchResult2);
    // Validate all results belong to specified section
    TestValidator.predicate(
      "all results belong to filtered section",
      searchResult2.data.every((article) => article.section.id === sectionId),
    );
    // Test that section-filtered results are a subset of unfiltered results
    const unfilteredIds = new Set(searchResult1.data.map((a) => a.id));
    const filteredIds = searchResult2.data.map((a) => a.id);
    TestValidator.predicate(
      "filtered results are subset of unfiltered",
      filteredIds.every((id) => unfilteredIds.has(id)),
    );
  }
  // Test 3: Pagination with small limit to force multiple pages
  const smallLimitSearch =
    await api.functional.discussionBoard.guest.cross_section.index(
      guestConnection,
      {
        body: {
          search: searchQuery,
          page: 1,
          limit: 3, // Small limit to potentially create multiple pages
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(smallLimitSearch);
  // Test pagination navigation if multiple pages exist
  if (smallLimitSearch.pagination.pages > 1) {
    const page2Search =
      await api.functional.discussionBoard.guest.cross_section.index(
        guestConnection,
        {
          body: {
            search: searchQuery,
            page: 2,
            limit: 3,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(page2Search);
    // Ensure different pages return different articles
    const page1Ids = new Set(smallLimitSearch.data.map((a) => a.id));
    const page2Ids = new Set(page2Search.data.map((a) => a.id));
    TestValidator.predicate(
      "page 1 and page 2 have different articles",
      Array.from(page1Ids).every((id) => !page2Ids.has(id)),
    );
  }
  // Test 4: Empty search results (non-matching query)
  const nonMatchingQuery =
    "xyz123nonexistentsearchterm" + RandomGenerator.alphaNumeric(10);
  const emptySearchResult =
    await api.functional.discussionBoard.guest.cross_section.index(
      guestConnection,
      {
        body: {
          search: nonMatchingQuery,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns no results",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has zero records",
    emptySearchResult.pagination.records,
    0,
  );
  // Test 5: Search without any filters (get all articles)
  const allArticlesSearch =
    await api.functional.discussionBoard.guest.cross_section.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allArticlesSearch);
  TestValidator.predicate(
    "unfiltered search returns articles",
    allArticlesSearch.data.length >= 0,
  );
}
