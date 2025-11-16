import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

/**
 * Validate that a todoAdmin can permanently delete a guest user identity and
 * that the deletion is reflected in subsequent guest user listings.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new todoAdmin and obtain admin authorization.
 * 2. As admin, create an ACTIVE-like Todo status so that real todos can be
 *    created.
 * 3. Register a new todoUser and obtain user authorization.
 * 4. As todoUser, create a Todo item that uses the created status code. (This
 *    ensures realistic pre-existing application data.)
 * 5. Switch back to the todoAdmin actor by logging in with admin credentials.
 * 6. As admin, query guest users with PATCH /todoApp/todoAdmin/guestUsers.
 * 7. Choose a concrete guestUserId from the returned page and delete it using
 *    DELETE /todoApp/todoAdmin/guestUsers/{guestUserId}.
 * 8. Query guest users again to verify that the deleted guest id is no longer
 *    present in the listing.
 *
 * Notes and constraints:
 *
 * - Only APIs defined in the provided SDK are used; no fictional endpoints.
 * - We do not attempt unauthenticated calls because connection.headers must not
 *   be manipulated directly. Instead, we focus on the positive admin-only
 *   deletion path and on verifying post-delete visibility.
 * - All responses are validated via typia.assert for strict type safety, and
 *   logical expectations are asserted with TestValidator.
 */
export async function test_api_todoadmin_delete_guest_user_after_data_cleanup(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin (join) and obtain admin authorization
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinRequest = {
    email: adminEmail,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorizedFromJoin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. As this admin, create an active Todo status
  const todoStatusCreateBody = {
    code: `ACTIVE-${RandomGenerator.alphaNumeric(8)}`,
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register a new todoUser and obtain user authorization
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const userJoinRequest = {
    email: userEmail,
    password: "UserPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorizedFromJoin: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinRequest,
    });
  typia.assert(userAuthorizedFromJoin);

  // 4. As todoUser, create a Todo item referencing the created status code
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    status_code: createdStatus.code,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.todoUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 5. Switch back to the todoAdmin actor by logging in with the same credentials
  const adminLoginRequest = {
    email: adminEmail,
    password: "AdminPassword!123",
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminAuthorizedFromLogin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginRequest,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. As admin, query guest users (must exist for deletion test to proceed)
  const guestIndexRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies ITodoAppGuestUser.IRequest;

  const guestPageBefore: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: guestIndexRequest,
    });
  typia.assert(guestPageBefore);

  // Ensure we have at least one guest user to delete; otherwise, fail explicitly.
  TestValidator.predicate(
    "there must be at least one guest user available for deletion",
    guestPageBefore.data.length > 0 && guestPageBefore.pagination.records > 0,
  );

  const targetGuest: ITodoAppGuestUser.ISummary = guestPageBefore.data[0];

  // 7. Delete the selected guest user
  await api.functional.todoApp.todoAdmin.guestUsers.erase(connection, {
    guestUserId: targetGuest.id,
  });

  // 8. Query guest users again and verify that the deleted id is not present
  const guestPageAfter: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.todoAdmin.guestUsers.index(connection, {
      body: guestIndexRequest,
    });
  typia.assert(guestPageAfter);

  const existsAfterDeletion: boolean = guestPageAfter.data.some(
    (guest) => guest.id === targetGuest.id,
  );

  TestValidator.predicate(
    "deleted guest user should no longer appear in guest user listings",
    existsAfterDeletion === false,
  );
}
