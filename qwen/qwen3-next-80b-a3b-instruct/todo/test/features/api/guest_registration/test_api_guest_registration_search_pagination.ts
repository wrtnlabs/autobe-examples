import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration_search_pagination(
  connection: api.IConnection,
) {
  // Create 15 guest registrations to ensure multiple pages of results are available
  const guestEmails: string[] = ArrayUtil.repeat(15, () => {
    return typia.random<string & tags.Format<"email">>();
  });

  // Establish authentication context with the first guest registration
  const firstGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmails[0],
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(firstGuest);

  // Create additional 14 guest registrations using the authenticated connection
  await ArrayUtil.asyncRepeat(14, async (index) => {
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmails[index + 1],
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ITodoListGuest.IJoin,
    });
  });

  // Test pagination with limit of 5 per page (3 pages total)
  const limit = 5;
  const page1: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: limit,
        page: 1,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(page1);
  TestValidator.equals("page 1 has exactly 5 items", page1.data.length, limit);
  TestValidator.equals(
    "page 1 pagination matches",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination limit matches",
    page1.pagination.limit,
    limit,
  );

  const page2: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: limit,
        page: 2,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(page2);
  TestValidator.equals("page 2 has exactly 5 items", page2.data.length, limit);
  TestValidator.equals(
    "page 2 pagination matches",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit matches",
    page2.pagination.limit,
    limit,
  );

  const page3: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: limit,
        page: 3,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(page3);
  TestValidator.equals("page 3 has exactly 5 items", page3.data.length, limit);
  TestValidator.equals(
    "page 3 pagination matches",
    page3.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 pagination limit matches",
    page3.pagination.limit,
    limit,
  );

  // Test edge case: requesting a page beyond available records
  const page4: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: limit,
        page: 4,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(page4);
  TestValidator.equals(
    "page 4 should return empty array",
    page4.data.length,
    0,
  );
  TestValidator.equals(
    "page 4 pagination current should be 4",
    page4.pagination.current,
    4,
  );
  TestValidator.equals(
    "page 4 pagination limit should be 5",
    page4.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "page 4 pagination pages should be 3",
    page4.pagination.pages,
    3,
  ); // Total pages = 15/5 = 3
  TestValidator.equals(
    "page 4 pagination records should be 15",
    page4.pagination.records,
    15,
  );

  // Test behavior when limit exceeds available records (should return all 15 on page 1)
  const largeLimit: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: 20, // greater than total records (15)
        page: 1,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit page should return all 15 items",
    largeLimit.data.length,
    15,
  );
  TestValidator.equals(
    "large limit pagination current should be 1",
    largeLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit pagination records should be 15",
    largeLimit.pagination.records,
    15,
  );
  TestValidator.equals(
    "large limit pagination pages should be 1",
    largeLimit.pagination.pages,
    1,
  );

  // Test empty page scenario: requesting a page with limit=1 and page=16 (beyond 15 records)
  const emptyPage: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        limit: 1,
        page: 16,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(emptyPage);
  TestValidator.equals(
    "very large page should return empty array",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "very large page pagination current should be 16",
    emptyPage.pagination.current,
    16,
  );
  TestValidator.equals(
    "very large page pagination pages should be 15",
    emptyPage.pagination.pages,
    15,
  );
}
