import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that updating a todo with a non-existent identifier fails and does
 * not upsert.
 *
 * Business context
 *
 * - Admins manage global system settings for the todo application.
 * - Member users own personal todos and can update them only when they already
 *   exist.
 * - The update endpoint must not allow creation/upsert when the todoId path
 *   parameter does not point to an existing record.
 *
 * Workflow
 *
 * 1. Bootstrap the system with an admin user and a basic system setting, so that
 *    configuration-dependent behavior is in place.
 * 2. Register and authenticate a member user who will attempt the todo update.
 * 3. Generate a random UUID to serve as a non-existent todoId (we never create any
 *    todo during this test).
 * 4. Call PUT /todoApp/memberUser/todos/{todoId} with a valid ITodoAppTodo.IUpdate
 *    body using the non-existent todoId.
 * 5. Assert that the call fails (throws) using TestValidator.error.
 * 6. Rely on the failure semantics to guarantee that no new todo was created as a
 *    side effect (i.e., the endpoint is not acting as an upsert).
 */
export async function test_api_todo_update_rejected_for_nonexistent_todo(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: RandomGenerator.mobile("010"),
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 1-2. Admin login (optional but realistic) to ensure login endpoint works and
  // to simulate typical flow. The SDK will update connection headers with the
  // admin access token again.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: "https://admin.todo-app.test/login",
    referrer: adminJoinBody.href,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 1-3. Create a basic system setting as admin
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos allowed per member user in tests.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(createdSetting);

  // 2. Member user registration (join)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2-2. Member login to mimic a fresh login flow; this overwrites the
  // Authorization header with the member user's token.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: memberJoinBody.href,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAfterLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // 3. Generate a random UUID for a non-existent todoId.
  const nonexistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare a valid update body. We intentionally do not create any todo, so
  // this ID should not match an existing record when calling update.
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    state: "active",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.IUpdate;

  // 5. Assert that updating a non-existent todo results in an error.
  await TestValidator.error("update non-existent todo must fail", async () => {
    await api.functional.todoApp.memberUser.todos.update(connection, {
      todoId: nonexistentTodoId,
      body: updateBody,
    });
  });

  // 6. No additional API exists here to list todos and prove that nothing was
  // created, but the semantics of the endpoint for a non-existent id should be
  // failure rather than creation. Therefore, the fact that we observed an
  // error is sufficient to validate that the endpoint is not acting as an
  // upsert for invalid identifiers.
}
