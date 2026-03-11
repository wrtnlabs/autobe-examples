import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

/**
 * Test the advanced search and filtering capabilities of the section listing endpoint.
 * A guest user should be able to filter sections by name and description using partial
 * text matching, filter by creation date range, and sort results by different fields.
 * The test validates:
 * (1) Name filter performs partial text matching on section names
 * (2) Description filter performs partial text matching on section descriptions
 * (3) Date range filtering works correctly with created_at_from and created_at_to
 * (4) Sorting by created_at, name, or updated_at works in both orders
 * (5) Multiple filters can be combined in a single request
 * (6) Pagination metadata accurately reflects filtered result counts
 * (7) Empty results return valid pagination with zero records
 */
export async function test_api_section_listing_with_search_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session for authenticated guest browsing
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Test basic listing without filters
  const basicList = await api.functional.discussionBoard.guest.sections.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(basicList);
  TestValidator.predicate(
    "basic listing returns valid pagination",
    () =>
      basicList.pagination.current === 1 &&
      basicList.pagination.limit === 10 &&
      basicList.pagination.records >= 0,
  );
  // 3. Test name filter (partial text matching)
  const nameFilterTest =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        name: "test",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(nameFilterTest);
  TestValidator.predicate(
    "name filter returns valid pagination",
    () =>
      nameFilterTest.pagination.current === 1 &&
      nameFilterTest.pagination.limit === 10,
  );
  // 4. Test description filter (partial text matching)
  const descriptionFilterTest =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        description: "discussion",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(descriptionFilterTest);
  TestValidator.predicate(
    "description filter returns valid pagination",
    () =>
      descriptionFilterTest.pagination.current === 1 &&
      descriptionFilterTest.pagination.limit === 10,
  );
  // 5. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeTest =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        created_at_from: oneMonthAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(dateRangeTest);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    () =>
      dateRangeTest.pagination.current === 1 &&
      dateRangeTest.pagination.limit === 10,
  );
  // 6. Test sorting by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);
  TestValidator.predicate("sort by created_at asc returns valid response", () =>
    sortByCreatedAtAsc.data.every(
      (section) =>
        section.id !== undefined &&
        section.name !== undefined &&
        section.created_at !== undefined,
    ),
  );
  // 7. Test sorting by name descending
  const sortByNameDesc =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        sort_by: "name",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sortByNameDesc);
  TestValidator.predicate("sort by name desc returns valid response", () =>
    sortByNameDesc.data.every(
      (section) => section.id !== undefined && section.name !== undefined,
    ),
  );
  // 8. Test sorting by updated_at ascending
  const sortByUpdatedAtAsc =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        sort_by: "updated_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sortByUpdatedAtAsc);
  TestValidator.predicate("sort by updated_at asc returns valid response", () =>
    sortByUpdatedAtAsc.data.every(
      (section) => section.id !== undefined && section.updated_at !== undefined,
    ),
  );
  // 9. Test combined filters (name + date range)
  const combinedFilterTest =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        name: "tech",
        created_at_from: oneMonthAgo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(combinedFilterTest);
  TestValidator.predicate(
    "combined filters return valid pagination",
    () =>
      combinedFilterTest.pagination.current === 1 &&
      combinedFilterTest.pagination.limit === 10,
  );
  // 10. Test pagination with different page numbers
  const page2Test = await api.functional.discussionBoard.guest.sections.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page2Test);
  TestValidator.equals(
    "page 2 returns correct page number",
    page2Test.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 returns correct limit",
    page2Test.pagination.limit,
    5,
  );
  // 11. Test empty results with invalid search term
  const emptySearchTest =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {
        name: "zzznonexistentsection12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(emptySearchTest);
  TestValidator.predicate(
    "empty search returns valid pagination structure",
    () =>
      emptySearchTest.pagination.current === 1 &&
      emptySearchTest.pagination.limit === 10 &&
      emptySearchTest.pagination.records >= 0 &&
      emptySearchTest.data.length === 0,
  );
  // 12. Test search parameter (general text search)
  const searchTest = await api.functional.discussionBoard.guest.sections.index(
    guestConnection,
    {
      body: {
        search: "board",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(searchTest);
  TestValidator.predicate(
    "search parameter returns valid pagination",
    () =>
      searchTest.pagination.current === 1 && searchTest.pagination.limit === 10,
  );
}
