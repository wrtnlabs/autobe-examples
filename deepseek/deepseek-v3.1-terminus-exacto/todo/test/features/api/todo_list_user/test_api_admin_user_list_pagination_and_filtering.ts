import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate admin user listing pagination, filtering, and access control for the
 * /todoList/admin/users endpoint.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate as that admin (join provides tokens).
 * 2. Query the admin user listing endpoint with no filters (default pagination),
 *    and with various search filters:
 *
 *    - By random non-existent email: expect empty data
 *    - By status: locked=true, deleted=true, normal (=active, unlocked)
 *    - By created_from and created_to: valid date ranges
 *    - By pagination (e.g., limit, page)
 * 3. For each filter, verify that returned summaries and pagination structure
 *    match the query and that filtering logic is enforced by business rules.
 * 4. Verify admin-only access by making a request with unauthenticated connection
 *    and expecting an error.
 */
export async function test_api_admin_user_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Query the admin user listing endpoint (no filters, default pagination)
  const resp1 = await api.functional.todoList.admin.users.index(connection, {
    body: {} satisfies ITodoListUser.IRequest,
  });
  typia.assert(resp1);
  TestValidator.predicate("response1 pagination present", !!resp1.pagination);
  TestValidator.predicate("response1 data is array", Array.isArray(resp1.data));
  // (Can't guarantee there are users, but must match schema regardless)
  for (const u of resp1.data) typia.assert(u);

  // 3. Search with random non-existent email (expect empty data)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const respNoUser = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: { email: nonExistentEmail } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(respNoUser);
  TestValidator.equals(
    "empty data for unknown email",
    respNoUser.data.length,
    0,
  );

  // 4. Filtering by lock status (locked=true): expect only locked users, or empty
  const respLocked = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: { locked: true } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(respLocked);
  for (const u of respLocked.data)
    TestValidator.equals("locked user must be locked", u.locked, true);

  // 5. Filtering by deleted accounts (deleted=true): only soft-deleted users or empty
  const respDeleted = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: { deleted: true } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(respDeleted);
  // No way to create soft-deleted users in this test, but verify response is valid and data only if deleted
  // Since summary does not show deleted_at, just validate that query works and doesn't crash
  TestValidator.equals(
    "deleted filter returns data array",
    Array.isArray(respDeleted.data),
    true,
  );

  // 6. Filtering by created_from/created_to
  const now = new Date();
  const isoNow = now.toISOString();
  const respCreatedRange = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        created_from: isoNow,
        created_to: isoNow,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(respCreatedRange);
  // Data may be empty, but must still be valid
  TestValidator.equals(
    "created_from/to returns array",
    Array.isArray(respCreatedRange.data),
    true,
  );

  // 7. Pagination params: limit, page
  const respPaginated = await api.functional.todoList.admin.users.index(
    connection,
    {
      body: {
        limit: 1 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(respPaginated);
  TestValidator.equals("pagination: limit", respPaginated.pagination.limit, 1);
  TestValidator.equals(
    "pagination: current page",
    respPaginated.pagination.current,
    1,
  );

  // 8. Access control: unauthenticated connection should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin user list forbidden",
    async () => {
      await api.functional.todoList.admin.users.index(unauthConn, {
        body: {} satisfies ITodoListUser.IRequest,
      });
    },
  );
}
