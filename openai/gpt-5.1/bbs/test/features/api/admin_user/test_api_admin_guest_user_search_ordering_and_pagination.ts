import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestuser";

/**
 * Validate ordering and pagination for admin guest user search.
 *
 * Business goal: ensure that the administrative guest-user listing endpoint
 * (PATCH /discussionBoard/adminUser/guestUsers) correctly applies ordering by
 * created_at and updated_at fields, and that pagination metadata and cross-page
 * slicing behave consistently for an authenticated adminUser.
 *
 * Scenario:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join. This both creates an
 *    admin record and configures the connection with the Authorization header
 *    via the SDK side-effect.
 * 2. Using the authenticated connection, call the guestUsers.index endpoint twice
 *    with identical filter criteria but different page indices:
 *
 *    - First request: order_by = "created_at", order_direction = "asc", page = 1,
 *         limit = 10.
 *    - Second request: same order_by/order_direction/limit but page = 2.
 * 3. For each response, assert type correctness with typia.assert and inspect
 *    pagination metadata:
 *
 *    - Pagination.current is zero-based and should reflect the resolved page index;
 *         when requesting page = 1 and page = 2, we at least verify that
 *         `current` is stable and within [0, pages-1].
 *    - Pagination.limit matches the effective page size and is > 0 when data exist.
 *    - Pagination.records and pagination.pages are non-negative and consistent:
 *         records === 0 implies pages === 0, otherwise pages >= 1.
 * 4. Validate in-page ordering for created_at asc: iterate over each page’s data
 *    array and check created_at[i] <= created_at[i+1]. Use
 *    TestValidator.predicate with descriptive titles.
 * 5. If page1 and page2 both contain at least one record, assert cross-page
 *    continuity and non-overlap:
 *
 *    - The last record of page1 should not be identical (by id) to the first record
 *         of page2.
 *    - When records across both pages are more than one page limit, we expect that
 *         sorting by created_at asc means created_at(last of page1) <=
 *         created_at(first of page2).
 * 6. Repeat steps 2–5 using ordering by updated_at desc instead of created_at asc,
 *    adjusting sort predicates accordingly (updated_at[i] >= updated_at[i+1]).
 *    Cross-page continuity then checks updated_at(last of page1) >=
 *    updated_at(first of page2) when both pages have data.
 *
 * Notes and simplifications:
 *
 * - We rely on existing seed data in discussion_board_guestusers; we do not
 *   create guest users in this test because no write APIs are provided.
 * - When the total record count is too small to populate both pages, the test
 *   will still validate single-page ordering and basic pagination metadata, but
 *   will skip cross-page continuity assertions with clear predicates.
 */
export async function test_api_admin_guest_user_search_ordering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Helper to validate pagination metadata consistency
  const assertPagination = (title: string, pagination: IPage.IPagination) => {
    TestValidator.predicate(
      `${title} - current is non-negative`,
      pagination.current >= 0,
    );
    TestValidator.predicate(
      `${title} - pages is non-negative`,
      pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title} - records is non-negative`,
      pagination.records >= 0,
    );
    if (pagination.records === 0) {
      TestValidator.equals(
        `${title} - zero records implies zero pages`,
        pagination.pages,
        0,
      );
    } else {
      TestValidator.predicate(
        `${title} - positive records imply at least one page`,
        pagination.pages >= 1,
      );
    }
  };

  // Helper to assert ascending ordering by a date-time field
  const assertAscending = (
    title: string,
    rows: IDiscussionBoardGuestUser.ISummary[],
    selector: (row: IDiscussionBoardGuestUser.ISummary) => string,
  ) => {
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = selector(rows[i]);
      const b = selector(rows[i + 1]);
      TestValidator.predicate(`${title} - ascending at index ${i}`, a <= b);
    }
  };

  // Helper to assert descending ordering by a date-time field
  const assertDescending = (
    title: string,
    rows: IDiscussionBoardGuestUser.ISummary[],
    selector: (row: IDiscussionBoardGuestUser.ISummary) => string,
  ) => {
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = selector(rows[i]);
      const b = selector(rows[i + 1]);
      TestValidator.predicate(`${title} - descending at index ${i}`, a >= b);
    }
  };

  // Scenario A: order_by = created_at, order_direction = asc
  const requestCreatedPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const createdPage1: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: requestCreatedPage1,
      },
    );
  typia.assert(createdPage1);

  assertPagination("created_at asc - page 1", createdPage1.pagination);
  assertAscending(
    "created_at asc - page 1 data",
    createdPage1.data,
    (row) => row.created_at,
  );

  const requestCreatedPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "created_at" as const,
    order_direction: "asc" as const,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const createdPage2: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: requestCreatedPage2,
      },
    );
  typia.assert(createdPage2);

  assertPagination("created_at asc - page 2", createdPage2.pagination);
  assertAscending(
    "created_at asc - page 2 data",
    createdPage2.data,
    (row) => row.created_at,
  );

  if (createdPage1.data.length > 0 && createdPage2.data.length > 0) {
    const lastOfPage1 = createdPage1.data[createdPage1.data.length - 1];
    const firstOfPage2 = createdPage2.data[0];

    TestValidator.predicate(
      "created_at asc - cross page ids are not identical",
      lastOfPage1.id !== firstOfPage2.id,
    );
    TestValidator.predicate(
      "created_at asc - cross page created_at continuity",
      lastOfPage1.created_at <= firstOfPage2.created_at,
    );
  }

  // Scenario B: order_by = updated_at, order_direction = desc
  const requestUpdatedPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "updated_at" as const,
    order_direction: "desc" as const,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const updatedPage1: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: requestUpdatedPage1,
      },
    );
  typia.assert(updatedPage1);

  assertPagination("updated_at desc - page 1", updatedPage1.pagination);
  assertDescending(
    "updated_at desc - page 1 data",
    updatedPage1.data,
    (row) => row.updated_at,
  );

  const requestUpdatedPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    order_by: "updated_at" as const,
    order_direction: "desc" as const,
  } satisfies IDiscussionBoardGuestUser.IRequest;

  const updatedPage2: IPageIDiscussionBoardGuestuser.ISummary =
    await api.functional.discussionBoard.adminUser.guestUsers.index(
      connection,
      {
        body: requestUpdatedPage2,
      },
    );
  typia.assert(updatedPage2);

  assertPagination("updated_at desc - page 2", updatedPage2.pagination);
  assertDescending(
    "updated_at desc - page 2 data",
    updatedPage2.data,
    (row) => row.updated_at,
  );

  if (updatedPage1.data.length > 0 && updatedPage2.data.length > 0) {
    const lastOfPage1 = updatedPage1.data[updatedPage1.data.length - 1];
    const firstOfPage2 = updatedPage2.data[0];

    TestValidator.predicate(
      "updated_at desc - cross page ids are not identical",
      lastOfPage1.id !== firstOfPage2.id,
    );
    TestValidator.predicate(
      "updated_at desc - cross page updated_at continuity",
      lastOfPage1.updated_at >= firstOfPage2.updated_at,
    );
  }
}
