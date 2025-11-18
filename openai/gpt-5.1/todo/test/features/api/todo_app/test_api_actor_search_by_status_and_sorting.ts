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

export async function test_api_actor_search_by_status_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin user who will perform actor searches.
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

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const targetStatus: string = adminAuthorized.status;

  // 2. Prepare multiple member users with distinct display names.
  const memberCount = 5;
  const memberAuthorizedList: ITodoAppMemberuser.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const memberEmail: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const memberPassword: string & tags.Format<"password"> = typia.random<
      string & tags.Format<"password">
    >();

    const displayNameBase = RandomGenerator.name(1);
    const memberJoinBody = {
      email: memberEmail,
      password: memberPassword,
      display_name: `${displayNameBase}-${i}`,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberUserJoin.IRequest;

    const memberAuthorized: ITodoAppMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: memberJoinBody,
      });
    typia.assert(memberAuthorized);
    memberAuthorizedList.push(memberAuthorized);

    TestValidator.equals(
      "joined member status should match its own status field",
      memberAuthorized.status,
      memberAuthorized.status,
    );

    const memberLoginBody = {
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberUserLogin.IRequest;

    const memberLoggedIn: ITodoAppMemberuser.IAuthorized =
      await api.functional.auth.memberUser.login(connection, {
        body: memberLoginBody,
      });
    typia.assert(memberLoggedIn);

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
      "created todo belongs to logged-in member user",
      createdTodo.memberUser.id,
      memberLoggedIn.id,
    );
  }

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    user_agent: null,
  } satisfies ITodoAppAdminUser.ILogin;

  const adminLoggedIn: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const anyMemberWithStatus = memberAuthorizedList.find(
    (m) => m.status === targetStatus,
  );
  const effectiveStatus: string =
    anyMemberWithStatus !== undefined
      ? anyMemberWithStatus.status
      : targetStatus;

  const firstSearchBody = {
    actorTypes: ["memberUser" satisfies IETodoAppActorType],
    status: effectiveStatus,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (memberCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "createdAt" satisfies IETodoAppActorSearchOrderBy,
    orderDirection: "desc" satisfies IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const firstPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: firstSearchBody,
    });
  typia.assert(firstPage);

  TestValidator.equals(
    "first search pagination current page should be 1",
    firstPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "first search pagination limit should equal requested limit",
    firstPage.pagination.limit,
    firstSearchBody.limit,
  );

  TestValidator.predicate(
    "first search should return at least one actor",
    firstPage.data.length > 0,
  );

  for (const actor of firstPage.data) {
    TestValidator.equals(
      "actorType should be memberUser",
      actor.actorType,
      "memberUser",
    );

    if (actor.status !== undefined) {
      TestValidator.equals(
        "actor status should match filter status when present",
        actor.status,
        effectiveStatus,
      );
    }
  }

  const actorsWithLastLogin = firstPage.data.filter(
    (a) => a.last_login_at !== null && a.last_login_at !== undefined,
  );

  if (actorsWithLastLogin.length >= 2) {
    const sortedByLastLoginDesc = [...actorsWithLastLogin].sort((x, y) => {
      const lx = x.last_login_at!;
      const ly = y.last_login_at!;
      if (lx < ly) return 1;
      if (lx > ly) return -1;
      return 0;
    });

    const observed = actorsWithLastLogin.map((a) => a.id);
    const expected = sortedByLastLoginDesc.map((a) => a.id);

    TestValidator.equals(
      "actors with last_login_at should be ordered by last_login_at desc",
      observed,
      expected,
    );
  }

  const secondSearchBody = {
    actorTypes: ["memberUser" satisfies IETodoAppActorType],
    status: effectiveStatus,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: (memberCount + 5) as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy: "displayName" satisfies IETodoAppActorSearchOrderBy,
    orderDirection: "asc" satisfies IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const secondPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: secondSearchBody,
    });
  typia.assert(secondPage);

  TestValidator.equals(
    "second search pagination current page should be 1",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second search pagination limit should equal requested limit",
    secondPage.pagination.limit,
    secondSearchBody.limit,
  );

  const displayNameActors = secondPage.data.filter(
    (a) => a.display_name !== undefined,
  );

  if (displayNameActors.length >= 2) {
    const displayNames = displayNameActors.map((a) => a.display_name!);
    const sortedNames = [...displayNames].sort((a, b) => a.localeCompare(b));

    TestValidator.equals(
      "actors should be ordered by display_name in ascending order",
      displayNames,
      sortedNames,
    );
  }

  for (const actor of secondPage.data) {
    TestValidator.equals(
      "actorType in second search should be memberUser",
      actor.actorType,
      "memberUser",
    );

    if (actor.status !== undefined) {
      TestValidator.equals(
        "actor status in second search should match filter status when present",
        actor.status,
        effectiveStatus,
      );
    }
  }
}
