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

/**
 * Validate admin actor search by type and email.
 *
 * Business goal: Ensure that an authenticated adminUser can search actors
 * filtered by actor type `memberUser` and an exact email address, and receives
 * a paginated result set whose contents and pagination metadata are coherent
 * with the request.
 *
 * Steps:
 *
 * 1. Register an admin user (POST /auth/adminUser/join) to obtain admin
 *    authorization context.
 * 2. Register a member user (POST /auth/memberUser/join) with a uniquely generated
 *    email address.
 * 3. Authenticate as the member user (POST /auth/memberUser/login) and create at
 *    least one todo (POST /todoApp/memberUser/todos) to represent activity by
 *    that actor.
 * 4. Authenticate as the admin user (POST /auth/adminUser/login) to ensure the
 *    current token context is adminUser.
 * 5. Call PATCH /todoApp/adminUser/actors/search via
 *    api.functional.todoApp.adminUser.actors.search.index with
 *    ITodoAppActorSearch.IRequest where:
 *
 *    - ActorTypes = ["memberUser"],
 *    - Email = memberUser.email,
 *    - Page = 1,
 *    - Limit = 10,
 *    - OrderBy = "createdAt",
 *    - OrderDirection = "desc".
 * 6. Assert that the response payload is a valid IPageITodoAppActorSearch.ISummary
 *    object using typia.assert.
 * 7. Validate business rules:
 *
 *    - Pagination.current === 1 and pagination.limit === 10.
 *    - Pagination.records >= data.length.
 *    - If records > 0 then pagination.pages >= 1.
 *    - Data.length may be 0 or more, but if > 0 then:
 *
 *         - Every summary.actorType === "memberUser".
 *         - Every summary.email (when defined) equals the memberUser email used in the
 *                   search filter.
 *         - At least one summary in data has email exactly equal to the memberUser email.
 *         - No summary has actorType "guestUser" or "adminUser".
 */
export async function test_api_actor_search_by_type_and_email(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorization
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a member user with a unique email
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const memberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Authenticate as the member user and create at least one todo
  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/login",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const memberLoginAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "created todo belongs to the logged-in member user",
    createdTodo.memberUser.email,
    memberEmail,
  );

  // 4. Authenticate back as the admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://todo-app.example.com/admin/login",
    referrer: "https://todo-app.example.com/admin",
    user_agent: "e2e-test-agent",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoginAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Call actor search filtered by type and email
  const page = 1;
  const limit = 10;

  const searchRequestBody = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    email: memberEmail,
    page,
    limit,
    orderBy: "createdAt" as IETodoAppActorSearchOrderBy,
    orderDirection: "desc" as IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const searchResult: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: searchRequestBody,
    });
  typia.assert(searchResult);

  const { pagination, data } = searchResult;

  // 6. Validate pagination metadata coherence
  TestValidator.equals(
    "pagination current page should match request page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "records must be non-negative and at least data.length",
    pagination.records >= 0 && pagination.records >= data.length,
  );

  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages must be at least 1 when records > 0",
      pagination.pages >= 1,
    );
  }

  // 7. Validate actor filtering and email matching in result data
  for (const actor of data) {
    TestValidator.equals(
      "each actor in result must be of type memberUser",
      actor.actorType,
      "memberUser",
    );

    if (actor.email !== undefined) {
      TestValidator.equals(
        "actor email, when present, must match searched member email",
        actor.email,
        memberEmail,
      );
    }

    TestValidator.predicate(
      "no guestUser or adminUser actors are present in results",
      actor.actorType === "memberUser",
    );
  }

  if (data.length > 0) {
    const hasTargetEmail = data.some(
      (actor) => actor.email !== undefined && actor.email === memberEmail,
    );

    TestValidator.predicate(
      "search results must contain at least one actor with the target member email",
      hasTargetEmail,
    );
  }
}
