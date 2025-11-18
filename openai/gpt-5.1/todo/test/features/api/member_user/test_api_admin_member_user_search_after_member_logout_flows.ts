import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberuser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberUserLogout } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogout";
import type { ITodoAppMemberUserLogoutAll } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogoutAll";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_member_user_search_after_member_logout_flows(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminJoinOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Register a member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberJoinOutput: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinOutput);

  // 3. Create multiple todos as the member user
  const todoBodies: ITodoAppTodo.ICreate[] = ArrayUtil.repeat(3, (index) => {
    const baseTitle = `member todo ${index + 1}`;
    return {
      title: baseTitle,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ITodoAppTodo.ICreate;
  });

  const todos: ITodoAppTodo[] = [];
  for (const body of todoBodies) {
    const todo: ITodoAppTodo =
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body,
      });
    typia.assert(todo);
    todos.push(todo);

    TestValidator.equals(
      "todo owner id should match member user id",
      todo.memberUser.id,
      memberJoinOutput.id,
    );
    TestValidator.equals(
      "todo owner email should match member email",
      todo.memberUser.email,
      memberJoinOutput.email,
    );
  }

  TestValidator.equals(
    "should have created 3 todos for the member user",
    todos.length,
    3,
  );

  // 4. Logout current member session
  const logoutResponse: ITodoAppMemberUserLogout.IResponse =
    await api.functional.auth.memberUser.logout(connection);
  typia.assert(logoutResponse);
  TestValidator.predicate(
    "single-session logout success flag should be true",
    logoutResponse.success === true,
  );

  // 5. Re-login and then logoutAll for the same member
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLoginOutput: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginOutput);

  const logoutAllResponse: ITodoAppMemberUserLogoutAll.IResponse =
    await api.functional.auth.memberUser.logoutAll(connection);
  typia.assert(logoutAllResponse);
  TestValidator.predicate(
    "logoutAll success flag should be true",
    logoutAllResponse.success === true,
  );

  // 6. Switch back to admin user via login (re-authenticate as admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "e2e-suite/1.0",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginOutput: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 7. Admin searches for member user by email using PATCH /todoApp/adminUser/memberUsers
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    email: memberEmail,
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    deleted: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ITodoAppMemberuser.IRequest;

  const searchResult: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result should contain at least one member user",
    searchResult.pagination.records >= 1,
  );

  const matchedMember: ITodoAppMemberuser.ISummary | undefined =
    searchResult.data.find((summary) => summary.email === memberEmail);

  TestValidator.predicate(
    "admin search should find the member user by email even after logout flows",
    matchedMember !== undefined,
  );

  if (matchedMember !== undefined) {
    TestValidator.equals(
      "matched summary id should equal created member id",
      matchedMember.id,
      memberJoinOutput.id,
    );

    TestValidator.equals(
      "matched summary email should equal created member email",
      matchedMember.email,
      memberJoinOutput.email,
    );

    TestValidator.equals(
      "matched summary status should equal latest member status",
      matchedMember.status,
      memberLoginOutput.status,
    );
  }
}
