import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_guest_users_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare distinct URLs used in join/login metadata
  const adminHref: string = "https://admin.todo-app.test/join";
  const adminReferrer: string = "https://admin.todo-app.test/landing";
  const memberHref: string = "https://member.todo-app.test/join";
  const memberReferrer: string = "https://member.todo-app.test/home";

  // 2. Create an admin user via /auth/adminUser/join (this also authenticates as admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: adminHref as string & tags.Format<"uri">,
    referrer: adminReferrer as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Configure at least one system setting via POST /todoApp/adminUser/systemSettings
  const systemSettingCreateBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos per member user for load control.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(systemSetting);

  // 4. Join a member user via /auth/memberUser/join (this also authenticates as member)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: memberHref as string & tags.Format<"uri">,
    referrer: memberReferrer as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create at least one todo for the member user using POST /todoApp/memberUser/todos
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 6. Build a simple guest user search request body
  const guestSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ITodoAppGuestUser.IRequest;

  // 7. Call PATCH /todoApp/adminUser/guestUsers WITHOUT any Authorization header
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guestUsers index should fail without authentication",
    async () => {
      await api.functional.todoApp.adminUser.guestUsers.index(
        unauthConnection,
        {
          body: guestSearchRequest,
        },
      );
    },
  );

  // 8. Ensure we have a fresh member token via /auth/memberUser/login
  const memberLoginBody = {
    email: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: memberHref as string & tags.Format<"uri">,
    referrer: memberReferrer as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoginAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 9. With member-authenticated connection (connection now holds member token),
  // attempt to search guest users and expect an authorization error.
  await TestValidator.error(
    "guestUsers index should fail for member-authenticated token",
    async () => {
      await api.functional.todoApp.adminUser.guestUsers.index(connection, {
        body: guestSearchRequest,
      });
    },
  );

  // 10. Re-authenticate as admin via /auth/adminUser/login
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: adminHref as string & tags.Format<"uri">,
    referrer: adminReferrer as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 11. With admin-authenticated connection, call guestUsers.index and expect success.
  const guestPage: IPageITodoAppGuestUser.ISummary =
    await api.functional.todoApp.adminUser.guestUsers.index(connection, {
      body: guestSearchRequest,
    });
  typia.assert(guestPage);

  // 12. Basic logical assertions on the returned page structure
  TestValidator.predicate(
    "guestUsers index returns non-negative pagination values",
    guestPage.pagination.current >= 0 &&
      guestPage.pagination.limit >= 0 &&
      guestPage.pagination.records >= 0 &&
      guestPage.pagination.pages >= 0,
  );
}
