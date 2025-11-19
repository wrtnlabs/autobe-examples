import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

export async function test_api_discussion_board_guest_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const joinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass!23",
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const loginBody = {
    username: joinBody.email,
    password: joinBody.password,
    href: "https://localhost/login",
    referrer: "https://localhost",
  } satisfies IDiscussionBoardAdmin.ILogin;

  const adminLoginAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(adminLoginAuthorized);

  // Prepare date strings for filters
  const dateFrom = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 10 days ago
  const dateTo = new Date().toISOString(); // now

  // 3. Search guest list without filters (pagination defaults)
  let searchRequest = {} satisfies IDiscussionBoardGuest.IRequest;
  let guestPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.admin.discussionBoardGuests.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(guestPage);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination.current is positive integer",
    Number.isInteger(guestPage.pagination.current) &&
      guestPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is positive integer",
    Number.isInteger(guestPage.pagination.limit) &&
      guestPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(guestPage.pagination.records) &&
      guestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is positive integer",
    Number.isInteger(guestPage.pagination.pages) &&
      guestPage.pagination.pages >= 1,
  );

  // 4. Search with nickname filter partial match
  const partialNickname =
    guestPage.data.length > 0
      ? guestPage.data[0].nickname.substring(0, 2)
      : "a";
  searchRequest = {
    nickname: partialNickname,
  } satisfies IDiscussionBoardGuest.IRequest;

  guestPage =
    await api.functional.discussionBoard.admin.discussionBoardGuests.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(guestPage);
  // Validate that all returned guests contain the partialNickname substring (case insensitive)
  for (const guest of guestPage.data) {
    TestValidator.predicate(
      `nickname includes partial filter: '${partialNickname}'`,
      guest.nickname.toLowerCase().includes(partialNickname.toLowerCase()),
    );
  }

  // 5. Search with created_at_from and created_at_to filters
  searchRequest = {
    created_at_from: dateFrom,
    created_at_to: dateTo,
  } satisfies IDiscussionBoardGuest.IRequest;

  guestPage =
    await api.functional.discussionBoard.admin.discussionBoardGuests.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(guestPage);
  // Validate that all guests have created_at within the date range
  // Note: created_at is not available in summary, so skip validation

  // 6. Search with pagination and sorting by nickname ascending
  searchRequest = {
    page: 1,
    limit: 10,
    sort_by: "nickname",
    sort_order: "asc",
  } satisfies IDiscussionBoardGuest.IRequest;

  guestPage =
    await api.functional.discussionBoard.admin.discussionBoardGuests.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(guestPage);
  // Validate guests list sorted by nickname ascending if more than 1 element
  for (let i = 1; i < guestPage.data.length; i++) {
    TestValidator.predicate(
      "guests sorted by nickname asc",
      guestPage.data[i - 1].nickname <= guestPage.data[i].nickname,
    );
  }

  // 7. Search with pagination and sorting by created_at descending
  searchRequest = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardGuest.IRequest;

  guestPage =
    await api.functional.discussionBoard.admin.discussionBoardGuests.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(guestPage);
  // created_at is not available in summary, so skip sorting validation
  // But confirm the data property is array
  TestValidator.predicate("data is array", Array.isArray(guestPage.data));
}
