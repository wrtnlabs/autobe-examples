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

export async function test_api_actor_search_filters_by_creation_date_range(
  connection: api.IConnection,
) {
  // 1. Register an admin user (adminUser.join) and keep its email/password
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@example.com`;
  const adminPassword: string = "Admin1234!";

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppAdminUser.IJoin,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminJoin);

  // Capture a baseline time before creating members
  const baselineBeforeMembers: string = new Date().toISOString();

  // 2. Create early batch of member users
  const earlyMembers: ITodoAppMemberuser.IAuthorized[] = [];
  const earlyCount = 2;
  for (let i = 0; i < earlyCount; i++) {
    const email: string & tags.Format<"email"> =
      `${RandomGenerator.alphabets(8)}@early.test` as string &
        tags.Format<"email">;
    const password: string & tags.Format<"password"> = "Member1234!" as string &
      tags.Format<"password">;
    const href: string & tags.Format<"uri"> =
      "https://todoapp.local/join" as string & tags.Format<"uri">;
    const referrer: string & tags.Format<"uri"> =
      "https://todoapp.local/landing" as string & tags.Format<"uri">;

    const member = await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        ip: null,
        href,
        referrer,
      } satisfies ITodoAppMemberUserJoin.IRequest,
    });
    typia.assert<ITodoAppMemberuser.IAuthorized>(member);
    earlyMembers.push(member);
  }

  // Record a mid timestamp between early and late batches
  const betweenBatches: string = new Date().toISOString();

  // 3. Create late batch of member users
  const lateMembers: ITodoAppMemberuser.IAuthorized[] = [];
  const lateCount = 3;
  for (let i = 0; i < lateCount; i++) {
    const email: string & tags.Format<"email"> =
      `${RandomGenerator.alphabets(8)}@late.test` as string &
        tags.Format<"email">;
    const password: string & tags.Format<"password"> = "Member1234!" as string &
      tags.Format<"password">;
    const href: string & tags.Format<"uri"> =
      "https://todoapp.local/join" as string & tags.Format<"uri">;
    const referrer: string & tags.Format<"uri"> =
      "https://todoapp.local/landing" as string & tags.Format<"uri">;

    const member = await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        ip: null,
        href,
        referrer,
      } satisfies ITodoAppMemberUserJoin.IRequest,
    });
    typia.assert<ITodoAppMemberuser.IAuthorized>(member);
    lateMembers.push(member);
  }

  const afterLateBatch: string = new Date().toISOString();

  // 3b. Optionally, create a todo as one of the late member users for realism
  const sampleLateMember = lateMembers[0];
  // login as that member (this will switch auth context but join already did too)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      email: sampleLateMember.email,
      password: "Member1234!" as string & tags.Format<"password">,
      ip: null,
      href: "https://todoapp.local/login" as string & tags.Format<"uri">,
      referrer: "https://todoapp.local/landing" as string & tags.Format<"uri">,
    } satisfies ITodoAppMemberUserLogin.IRequest,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert<ITodoAppTodo>(createdTodo);
  TestValidator.equals(
    "created todo belongs to sample late member",
    createdTodo.memberUser.id,
    sampleLateMember.id,
  );

  // 4. Switch back to admin user via login
  await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail as string & tags.Format<"email">,
      password: adminPassword as string & tags.Format<"password">,
      ip: null,
      href: "https://todoapp.local/admin/login" as string & tags.Format<"uri">,
      referrer: "https://todoapp.local/admin" as string & tags.Format<"uri">,
      user_agent: "e2e-test-agent" as string,
    } satisfies ITodoAppAdminUser.ILogin,
  });

  // Helper: compute createdFrom/createdTo based on recorded timestamps.
  const createdFromForLate: string & tags.Format<"date-time"> =
    betweenBatches as string & tags.Format<"date-time">;
  const createdToForLate: string & tags.Format<"date-time"> =
    afterLateBatch as string & tags.Format<"date-time">;

  const memberActorType: IETodoAppActorType = "memberUser";
  const orderBy: IETodoAppActorSearchOrderBy = "createdAt";
  const orderDirection: IEOrderDirection = "asc";

  // 5. Call search endpoint to fetch only late-batch members by creation range
  const lateSearchRequest: ITodoAppActorSearch.IRequest = {
    actorTypes: [memberActorType],
    createdFrom: createdFromForLate,
    createdTo: createdToForLate,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy,
    orderDirection,
  };

  const lateSearchPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: lateSearchRequest,
    });
  typia.assert<IPageITodoAppActorSearch.ISummary>(lateSearchPage);

  const lateSearchActors = lateSearchPage.data;

  // 6. Assert that all results are memberUser actors
  for (const actor of lateSearchActors) {
    TestValidator.equals(
      "actor type is memberUser in late window",
      actor.actorType,
      memberActorType,
    );
  }

  // Map ids for quick membership checks
  const earlyIds = new Set(earlyMembers.map((m) => m.id));
  const lateIds = new Set(lateMembers.map((m) => m.id));

  // Assert that no early member IDs are present
  for (const actor of lateSearchActors) {
    TestValidator.predicate(
      "late window search should not contain early member ids",
      earlyIds.has(actor.id) === false,
    );
  }

  // Assert that at least some late members are present (could be subset if other preexisting data also matches)
  const matchedLateIds = lateSearchActors
    .map((a) => a.id)
    .filter((id) => lateIds.has(id));
  TestValidator.predicate(
    "late window search should contain at least one late member",
    matchedLateIds.length > 0,
  );

  // Pagination sanity checks
  const pagination = lateSearchPage.pagination;
  TestValidator.predicate(
    "pagination.current is 1 for first page in late window search",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is respected in late window search",
    lateSearchActors.length <= pagination.limit,
  );

  // 7. Second search: window targeting early batch only
  const createdFromForEarly: string & tags.Format<"date-time"> =
    baselineBeforeMembers as string & tags.Format<"date-time">;
  const createdToForEarly: string & tags.Format<"date-time"> =
    betweenBatches as string & tags.Format<"date-time">;

  const earlySearchRequest: ITodoAppActorSearch.IRequest = {
    actorTypes: [memberActorType],
    createdFrom: createdFromForEarly,
    createdTo: createdToForEarly,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    orderBy,
    orderDirection,
  };

  const earlySearchPage: IPageITodoAppActorSearch.ISummary =
    await api.functional.todoApp.adminUser.actors.search.index(connection, {
      body: earlySearchRequest,
    });
  typia.assert<IPageITodoAppActorSearch.ISummary>(earlySearchPage);

  const earlySearchActors = earlySearchPage.data;

  for (const actor of earlySearchActors) {
    TestValidator.equals(
      "actor type is memberUser in early window",
      actor.actorType,
      memberActorType,
    );
  }

  // Assert that no late member IDs are present in early search
  for (const actor of earlySearchActors) {
    TestValidator.predicate(
      "early window search should not contain late member ids",
      lateIds.has(actor.id) === false,
    );
  }

  const matchedEarlyIds = earlySearchActors
    .map((a) => a.id)
    .filter((id) => earlyIds.has(id));
  TestValidator.predicate(
    "early window search should contain at least one early member",
    matchedEarlyIds.length > 0,
  );

  const earlyPagination = earlySearchPage.pagination;
  TestValidator.predicate(
    "pagination.current is 1 for first page in early window search",
    earlyPagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is respected in early window search",
    earlySearchActors.length <= earlyPagination.limit,
  );
}
