import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration_search_combined_filters(
  connection: api.IConnection,
) {
  const gmailEmails = ArrayUtil.repeat(
    5,
    () => `${RandomGenerator.alphaNumeric(8)}@gmail.com`,
  );

  // Create at least 5 Gmail registrations
  const createPromises = gmailEmails.map((email) => {
    return api.functional.auth.guest.join(connection, {
      body: {
        email: email,
        href: "https://example.com/register",
        referrer: "https://example.com/home",
        ip: "192.168.1.1",
      } satisfies ITodoListGuest.IJoin,
    });
  });
  await Promise.all(createPromises);

  // Test search with pattern and pagination
  const searchRequest: ITodoListGuest.IRequest = {
    search: "gmail",
    page: 1,
    limit: 5,
  };

  const result = await api.functional.todoList.guest.todo_list_guests.search(
    connection,
    {
      body: searchRequest satisfies ITodoListGuest.IRequest,
    },
  );
  typia.assert(result);

  // Validate pagination limits exactly as per request
  TestValidator.equals(
    "Pagination limit respected",
    result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "Pagination page requested is returned",
    result.pagination.current,
    1,
  );

  // Validate that all returned emails match the pattern
  TestValidator.predicate("All results contain search term", () => {
    return result.data.every((guest) => guest.email.includes("gmail"));
  });

  // Confirm we received at least the number requested
  TestValidator.predicate("Results count at least equals limit", () => {
    return result.data.length >= 5;
  });

  // Test second page
  const secondResult =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        search: "gmail",
        page: 2,
        limit: 5,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(secondResult);

  TestValidator.equals(
    "Second page limit respected",
    secondResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "Second page page number is 2",
    secondResult.pagination.current,
    2,
  );

  // Verify no overlap between pages
  const firstPageEmails = result.data.map((g) => g.email);
  const secondPageEmails = secondResult.data.map((g) => g.email);
  TestValidator.predicate("No email overlap between pages", () => {
    return firstPageEmails.every((email) => !secondPageEmails.includes(email));
  });
}
