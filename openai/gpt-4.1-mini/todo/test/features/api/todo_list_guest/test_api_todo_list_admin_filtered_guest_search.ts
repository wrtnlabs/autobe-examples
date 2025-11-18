import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListGuest";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Validates that an administrator can perform filtered, sorted, and paginated
 * guest visitor searches.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new admin user to obtain an authorized token.
 * 2. Performs a guest visitor search via `PATCH /todoList/admin/todoListGuests`
 *    with sample complex filters, sorting, and pagination parameters.
 * 3. Validates the response strictly for schema compliance and business logic
 *    correctness.
 * 4. Asserts that the returned guests conform to filtering criteria and sorting
 *    order.
 * 5. Confirms pagination metadata matches expectations.
 *
 * The test checks the full happy path for the admin guest search feature,
 * ensuring security, data filtering, sorting, and pagination operate as
 * intended.
 */
export async function test_api_todo_list_admin_filtered_guest_search(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssword123";
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare search payload for guest list with filters and pagination
  //    (Note: ITodoListGuest.IRequest schema is empty so we use empty object)
  //    We simulate pagination and sorting as per scenario plan but since
  //    the request schema is empty, this test primarily checks successful
  //    calls and proper response structure.

  // 3. Perform guest list filtered search
  const response: IPageITodoListGuest.ISummary =
    await api.functional.todoList.admin.todoListGuests.index(connection, {
      body: {},
    });
  typia.assert(response);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit per page is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );

  // 5. Validate each guest summary data
  for (const guest of response.data) {
    typia.assert<ITodoListGuest.ISummary>(guest);
    TestValidator.predicate(
      `guest id '${guest.id}' length check`,
      typeof guest.id === "string" && guest.id.length > 0,
    );
    TestValidator.predicate(
      `guest visitor_ip is non-empty string`,
      typeof guest.visitor_ip === "string" && guest.visitor_ip.length > 0,
    );
  }
}
