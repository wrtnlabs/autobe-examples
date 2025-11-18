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
 * Validate pagination behavior of admin actor search for member users.
 *
 * Business context:
 *
 * - Admins need to search and browse actors (users) with stable pagination.
 * - When multiple member users exist, paging through search results must return
 *   consistent metadata, non-overlapping result sets between pages, and
 *   predictable behavior when the page size (limit) changes.
 *
 * Steps:
 *
 * 1. Register an admin user and authenticate as that admin.
 * 2. Register multiple member users with distinct emails and optional display
 *    names.
 * 3. For one dedicated member, log in and create a todo to simulate realistic
 *    activity.
 * 4. Switch back to the admin account.
 * 5. Call actors.search for page=1, limit=2, ordered by createdAt asc for
 *    memberUser actors.
 * 6. Call actors.search again for page=2 with same filters and limit.
 * 7. Compare metadata and actor ID sets across page 1 and 2.
 * 8. Optionally, repeat search with a different limit (e.g., 3) and verify that
 *    first-page results with smaller limit are contained in first-page results
 *    with larger limit.
 */
export async function test_api_actor_search_pagination_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin user and authenticate as that admin.
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

  const adminAuthorizedFromJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedFromJoin);

  // 2. Register multiple member users with distinct emails and display names.
  const MEMBER_COUNT = 5;
  const memberAuthorizedList: ITodoAppMemberuser.IAuthorized[] = [];

  for (let i = 0; i < MEMBER_COUNT; i++) {
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberUserJoin.IRequest;

    const memberAuthorized: ITodoAppMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: memberJoinBody,
      });
    typia.assert<ITodoAppMemberuser.IAuthorized>(memberAuthorized);
    memberAuthorizedList.push(memberAuthorized);
  }

  // 3. Create a dedicated member for todo creation to simulate activity.
  const todoMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const todoMemberPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const todoMemberJoinBody = {
    email: todoMemberEmail,
    password: todoMemberPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const todoMemberAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: todoMemberJoinBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(todoMemberAuthorized);

  const todoMemberLoginBody = {
    email: todoMemberEmail,
    password: todoMemberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const todoMemberAuthorizedFromLogin: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: todoMemberLoginBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(todoMemberAuthorizedFromLogin);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(todo);

  // 4. Switch back to the admin account via login to ensure admin token.
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
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorizedFromLogin);

  // 5. First page search: page=1, limit=2 for memberUser actors.
  const PAGE_LIMIT_SMALL = 2 as const;
  const firstSearchBody = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    page: 1,
    limit: PAGE_LIMIT_SMALL,
    orderBy: "createdAt" as IETodoAppActorSearchOrderBy,
    orderDirection: "asc" as IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const firstPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: firstSearchBody,
    });
  typia.assert<IPageITodoAppActorSearch.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstIds = firstPage.data.map((actor) => actor.id);

  TestValidator.equals(
    "first page current should be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should equal requested limit",
    firstPagination.limit,
    PAGE_LIMIT_SMALL,
  );
  TestValidator.predicate(
    "first page records should be >= number of actors returned",
    firstPagination.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "first page pages should be at least 1 when records exist",
    firstPagination.records === 0 || firstPagination.pages >= 1,
  );
  TestValidator.predicate(
    "first page should not return more actors than limit",
    firstPage.data.length <= firstPagination.limit,
  );

  // 6. Second page search: page=2 with same limit and filters.
  const secondSearchBody = {
    actorTypes: ["memberUser" as IETodoAppActorType],
    page: 2,
    limit: PAGE_LIMIT_SMALL,
    orderBy: "createdAt" as IETodoAppActorSearchOrderBy,
    orderDirection: "asc" as IEOrderDirection,
  } satisfies ITodoAppActorSearch.IRequest;

  const secondPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: secondSearchBody,
    });
  typia.assert<IPageITodoAppActorSearch.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;
  const secondIds = secondPage.data.map((actor) => actor.id);

  TestValidator.equals(
    "second page current should be 2",
    secondPagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should equal requested limit",
    secondPagination.limit,
    PAGE_LIMIT_SMALL,
  );
  TestValidator.equals(
    "second page records should equal first page records",
    secondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "second page pages should equal first page pages",
    secondPagination.pages,
    firstPagination.pages,
  );
  TestValidator.predicate(
    "second page should not return more actors than limit",
    secondPage.data.length <= secondPagination.limit,
  );

  // 7. Cross-page consistency checks.
  const combinedIds = [...firstIds, ...secondIds];

  TestValidator.predicate(
    "combined size should equal sum of individual page sizes",
    combinedIds.length === firstIds.length + secondIds.length,
  );

  const firstIdSet = new Set(firstIds);
  const hasOverlap = secondIds.some((id) => firstIdSet.has(id));
  TestValidator.predicate(
    "page 1 and page 2 actor ID sets should be non-overlapping for same query",
    !hasOverlap,
  );

  const computedPages =
    firstPagination.limit === 0
      ? 0
      : Math.ceil(firstPagination.records / firstPagination.limit);

  TestValidator.predicate(
    "records should be <= pages * limit",
    firstPagination.records <= firstPagination.pages * firstPagination.limit,
  );
  TestValidator.equals(
    "pages should equal ceil(records / limit)",
    firstPagination.pages,
    computedPages,
  );

  // 8. Optional scenario with different limit when there are enough records.
  if (firstPagination.records >= 3) {
    const NEW_LIMIT = 3 as const;
    const altSearchBody = {
      actorTypes: ["memberUser" as IETodoAppActorType],
      page: 1,
      limit: NEW_LIMIT,
      orderBy: "createdAt" as IETodoAppActorSearchOrderBy,
      orderDirection: "asc" as IEOrderDirection,
    } satisfies ITodoAppActorSearch.IRequest;

    const altPage: IPageITodoAppActorSearch.ISummary =
      await api.functional.todoApp.adminUser.actors.search.index(connection, {
        body: altSearchBody,
      });
    typia.assert<IPageITodoAppActorSearch.ISummary>(altPage);

    const altPagination = altPage.pagination;
    const altIds = altPage.data.map((actor) => actor.id);

    TestValidator.equals(
      "alt page current should be 1",
      altPagination.current,
      1,
    );
    TestValidator.equals(
      "alt limit should equal requested NEW_LIMIT",
      altPagination.limit,
      NEW_LIMIT,
    );
    TestValidator.equals(
      "alt records should equal previous records",
      altPagination.records,
      firstPagination.records,
    );
    TestValidator.predicate(
      "alt page should not return more actors than NEW_LIMIT",
      altPage.data.length <= altPagination.limit,
    );

    // When using the same ordering, page=1 with a smaller limit should yield
    // a subset of the actors from page=1 with a larger limit.
    const altIdSet = new Set(altIds);
    const allFirstPageIdsAreInAlt = firstIds.every((id) => altIdSet.has(id));
    TestValidator.predicate(
      "first-page IDs with smaller limit should be contained in first-page IDs with larger limit",
      allFirstPageIdsAreInAlt,
    );
  }
}
