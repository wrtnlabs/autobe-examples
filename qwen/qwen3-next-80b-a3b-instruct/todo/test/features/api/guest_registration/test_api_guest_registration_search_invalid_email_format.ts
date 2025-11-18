import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration_search_invalid_email_format(
  connection: api.IConnection,
) {
  const joinResponse = await api.functional.auth.guest.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies ITodoListGuest.IJoin,
  });
  typia.assert(joinResponse);

  await TestValidator.error("invalid email format should fail", async () => {
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: {
        search: "not-an-email",
      } satisfies ITodoListGuest.IRequest,
    });
  });
}
