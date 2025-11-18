import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEOrderDirection";
import type { IETodoAppActorSearchOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorSearchOrderBy";
import type { IETodoAppActorType } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoAppActorType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActorSearch";
import type { ITodoAppActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActorSearch";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_actor_search_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin setup via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Member setup via join
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorizedFromJoin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 2-1. Create a todo as the member user
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  // 3. Unauthenticated access attempt: build separate connection without headers
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  const minimalSearchRequestUnauth = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    page: 1,
    limit: 10,
  } satisfies ITodoAppActorSearch.IRequest;

  await TestValidator.error(
    "unauthenticated caller cannot access admin actor search",
    async () => {
      await api.functional.todoApp.adminUser.actors.search.index(unauthConn, {
        body: minimalSearchRequestUnauth,
      });
    },
  );

  // 4. Member-authenticated access attempt (non-admin)
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberAuthorizedFromLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  const minimalSearchRequestMember = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    page: 1,
    limit: 10,
  } satisfies ITodoAppActorSearch.IRequest;

  await TestValidator.error(
    "memberUser cannot access admin-only actor search",
    async () => {
      await api.functional.todoApp.adminUser.actors.search.index(connection, {
        body: minimalSearchRequestMember,
      });
    },
  );

  // 5. Admin-authenticated happy path via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: null,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const searchRequestAsAdmin = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    email: memberEmail,
    page: 1,
    limit: 10,
    orderBy: "createdAt" as IETodoAppActorSearchOrderBy,
    orderDirection: "desc" as IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const searchResultAsAdmin: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: searchRequestAsAdmin,
    });
  typia.assert(searchResultAsAdmin);

  // Basic pagination sanity check
  TestValidator.predicate(
    "admin actor search returns first page",
    () => searchResultAsAdmin.pagination.current === 1,
  );

  TestValidator.predicate(
    "admin actor search limit is positive",
    () => searchResultAsAdmin.pagination.limit > 0,
  );

  // Verify that at least one memberUser actor with the memberEmail exists in results
  const hasMemberActor = searchResultAsAdmin.data.some((actor) => {
    return actor.actorType === "memberUser" && actor.email === memberEmail;
  });

  TestValidator.predicate(
    "admin actor search includes the created member user actor",
    hasMemberActor,
  );
}
