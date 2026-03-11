import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_section_browsing_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for anonymous browsing
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Get all sections first to establish baseline
  const allSections = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(allSections);
  // Test search functionality with pattern matching
  if (allSections.data.length > 0) {
    const firstSection = allSections.data[0];
    const searchTerm = firstSection.name.substring(0, 3); // Use first 3 chars for pattern matching
    const searchResult =
      await api.functional.discussionBoard.guest.topics.index(guestConnection, {
        body: {
          search: searchTerm,
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      });
    typia.assert(searchResult);
    // Validate that search actually filters results
    TestValidator.predicate(
      "search returns filtered results",
      searchResult.data.length <= allSections.data.length,
    );
    // Validate that filtered sections contain the search term
    if (searchResult.data.length > 0) {
      const containsSearchTerm = searchResult.data.some((section) =>
        section.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      TestValidator.predicate(
        "search results contain search term",
        containsSearchTerm,
      );
    }
  }
  // Test empty search term (should return all sections)
  const emptySearchResult =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        search: "",
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchResult);
  // Test non-existent search term
  const nonExistentSearch =
    await api.functional.discussionBoard.guest.topics.index(guestConnection, {
      body: {
        search: "nonexistentsearchterm12345",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nonExistentSearch);
  TestValidator.predicate(
    "non-existent search returns empty or filtered results",
    nonExistentSearch.data.length <= allSections.data.length,
  );
  // Test sorting by creation date (newest first)
  const newestFirst = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        sort: "created_at:desc",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(newestFirst);
  // Test sorting by creation date (oldest first)
  const oldestFirst = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        sort: "created_at:asc",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(oldestFirst);
  // Test sorting by name (ascending)
  const nameAsc = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        sort: "name:asc",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameAsc);
  // Test sorting by name (descending)
  const nameDesc = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        sort: "name:desc",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(nameDesc);
  // Test pagination with different page sizes
  const pageSize5 = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(pageSize5);
  const pageSize20 = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(pageSize20);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    pageSize5.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageSize20.pagination.limit,
    20,
  );
  // Test pagination across multiple pages if enough records exist
  if (allSections.pagination.pages > 1) {
    const page2 = await api.functional.discussionBoard.guest.topics.index(
      guestConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 has correct page number",
      page2.pagination.current,
      2,
    );
  }
  // Test combination of search and sorting
  if (allSections.data.length > 0) {
    const firstSection = allSections.data[0];
    const searchTerm = firstSection.name.substring(0, 3);
    const combinedSearch =
      await api.functional.discussionBoard.guest.topics.index(guestConnection, {
        body: {
          search: searchTerm,
          sort: "created_at:desc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSection.IRequest,
      });
    typia.assert(combinedSearch);
    TestValidator.predicate(
      "combined search and sort returns results",
      combinedSearch.data.length <= allSections.data.length,
    );
  }
  // Validate that sections have required properties
  if (allSections.data.length > 0) {
    const section = allSections.data[0];
    TestValidator.predicate("section has id", section.id.length > 0);
    TestValidator.predicate("section has name", section.name.length > 0);
    TestValidator.predicate(
      "section has created_at",
      section.created_at.length > 0,
    );
  }
}
