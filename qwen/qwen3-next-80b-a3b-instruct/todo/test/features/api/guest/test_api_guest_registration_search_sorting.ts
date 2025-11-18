import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_registration_search_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as guest to establish context (required before any guest operations)
  const guestEmail1 = typia.random<string & tags.Format<"email">>();
  const guest1: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail1,
        href: "https://example.com/page1",
        referrer: "https://example.com/home",
        ip: "192.168.1.1",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest1);

  // Step 2: Create a second guest registration with a different email
  const guestEmail2 = typia.random<string & tags.Format<"email">>();
  const guest2: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail2,
        href: "https://example.com/page2",
        referrer: "https://example.com/page1",
        ip: "192.168.1.2",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest2);

  // Step 3: Create a third guest registration with a different email
  const guestEmail3 = typia.random<string & tags.Format<"email">>();
  const guest3: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail3,
        href: "https://example.com/page3",
        referrer: "https://example.com/page2",
        ip: "192.168.1.3",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guest3);

  // Step 4: Create a searching value for sort_by: 'created_at' asc
  const searchRequestBodyAsc: ITodoListGuest.IRequest = {
    sort_by: "created_at",
    order: "asc",
  };
  const resultAsc: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: searchRequestBodyAsc,
    });
  typia.assert(resultAsc);
  TestValidator.equals(
    "correct number of records in ascending order",
    resultAsc.data.length,
    3,
  );

  // We cannot assume deterministic order by created_at if timestamps are identical, so we verify only count

  // Step 5: Create a searching value for sort_by: 'created_at' desc
  const searchRequestBodyDesc: ITodoListGuest.IRequest = {
    sort_by: "created_at",
    order: "desc",
  };
  const resultDesc: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: searchRequestBodyDesc,
    });
  typia.assert(resultDesc);
  TestValidator.equals(
    "correct number of records in descending order",
    resultDesc.data.length,
    3,
  );

  // We cannot assume deterministic order by created_at if timestamps are identical, so we verify only count

  // Step 6: Create a searching value for sort_by: 'email' asc
  const searchRequestBodyEmailAsc: ITodoListGuest.IRequest = {
    sort_by: "email",
    order: "asc",
  };
  const resultEmailAsc: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: searchRequestBodyEmailAsc,
    });
  typia.assert(resultEmailAsc);
  TestValidator.equals(
    "correct number of records in email ascending order",
    resultEmailAsc.data.length,
    3,
  );

  // Verify ascending sort by email: lexicographically smallest first
  const sortedEmails = [guestEmail1, guestEmail2, guestEmail3].sort();
  TestValidator.equals(
    "first record email matches lexicographically smallest",
    resultEmailAsc.data[0].email,
    sortedEmails[0],
  );
  TestValidator.equals(
    "second record email matches middle lex order",
    resultEmailAsc.data[1].email,
    sortedEmails[1],
  );
  TestValidator.equals(
    "third record email matches lexicographically largest",
    resultEmailAsc.data[2].email,
    sortedEmails[2],
  );

  // Step 7: Create a searching value for sort_by: 'email' desc
  const searchRequestBodyEmailDesc: ITodoListGuest.IRequest = {
    sort_by: "email",
    order: "desc",
  };
  const resultEmailDesc: IPageITodoListGuest =
    await api.functional.todoList.guest.todo_list_guests.search(connection, {
      body: searchRequestBodyEmailDesc,
    });
  typia.assert(resultEmailDesc);
  TestValidator.equals(
    "correct number of records in email descending order",
    resultEmailDesc.data.length,
    3,
  );

  // Verify descending sort by email: lexicographically largest first
  const sortedEmailsDesc = [guestEmail1, guestEmail2, guestEmail3]
    .sort()
    .reverse();
  TestValidator.equals(
    "first record email matches lexicographically largest",
    resultEmailDesc.data[0].email,
    sortedEmailsDesc[0],
  );
  TestValidator.equals(
    "second record email matches middle lex order",
    resultEmailDesc.data[1].email,
    sortedEmailsDesc[1],
  );
  TestValidator.equals(
    "third record email matches lexicographically smallest",
    resultEmailDesc.data[2].email,
    sortedEmailsDesc[2],
  );
}
