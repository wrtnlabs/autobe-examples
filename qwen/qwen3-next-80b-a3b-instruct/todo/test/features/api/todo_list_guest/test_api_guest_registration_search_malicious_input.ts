import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration_search_malicious_input(
  connection: api.IConnection,
) {
  const guestEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse = await api.functional.auth.guest.join(connection, {
    body: {
      email: guestEmail,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ITodoListGuest.IJoin,
  });
  typia.assert(joinResponse);

  const maliciousInputs = [
    "' OR '1'='1",
    "<script>alert('XSS')</script>",
    "1; DROP TABLE users;--",
    "' UNION SELECT * FROM users--",
    '""""""""""""',
    "1=1",
    "' OR 1=1--",
    "\x00\x22\x27\x73\x65\x6c\x65\x63\x74\x20\x66\x69\x6c\x65\x20\x66\x72\x6f\x6d\x20\x75\x73\x65\x72\x73",
    "'||'1'=='1'",
  ];

  for (const maliciousInput of maliciousInputs) {
    const searchResponse =
      await api.functional.todoList.guest.todo_list_guests.search(connection, {
        body: {
          search: maliciousInput,
          page: 1,
          limit: 10,
        } satisfies ITodoListGuest.IRequest,
      });
    typia.assert(searchResponse);
    TestValidator.equals(
      "search response should be empty for malicious input",
      searchResponse.data.length,
      0,
    );
  }

  const legitimateSearch = "valid@example.com";
  const legitimateResponse =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        search: legitimateSearch,
        page: 1,
        limit: 10,
      } satisfies ITodoListGuest.IRequest,
    });
  typia.assert(legitimateResponse);
}
