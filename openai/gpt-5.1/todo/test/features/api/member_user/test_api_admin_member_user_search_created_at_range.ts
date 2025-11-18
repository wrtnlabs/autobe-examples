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
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_admin_member_user_search_created_at_range(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.adminUser.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppAdminUser.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Explicitly login as admin to simulate typical flow (ensures token header is set)
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.todo-app.test/login",
      referrer: "https://admin.todo-app.test/",
      user_agent: "e2e-test-agent",
    } satisfies ITodoAppAdminUser.ILogin,
  });
  typia.assert(adminLogin);

  // Helper to create a member user via auth join
  const createMemberUser = async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = typia.random<string & tags.Format<"password">>();

    const authorized = await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://todo-app.test/join",
        referrer: "https://todo-app.test/landing",
      } satisfies ITodoAppMemberUserJoin.IRequest,
    });
    typia.assert(authorized);

    return {
      email,
      password,
      authorized,
    };
  };

  // Helper to login as a member user (switch actor context)
  const loginMemberUser = async (email: string, password: string) => {
    const authorized = await api.functional.auth.memberUser.login(connection, {
      body: {
        email,
        password,
        ip: null,
        href: "https://todo-app.test/login",
        referrer: "https://todo-app.test/",
      } satisfies ITodoAppMemberUserLogin.IRequest,
    });
    typia.assert(authorized);
    return authorized;
  };

  // Helper to create a simple todo as the current member user
  const createTodo = async () => {
    const todo = await api.functional.todoApp.memberUser.todos.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  };

  // 3. Create Group A member users (earlier in time)
  const groupACount = 3;
  const groupA = await ArrayUtil.asyncRepeat(groupACount, async () => {
    const member = await createMemberUser();
    // Switch to member and create a todo for realism
    await loginMemberUser(member.email, member.password);
    await createTodo();
    return member;
  });

  // Capture a boundary time after Group A creation
  const boundaryAfterGroupA: string = new Date().toISOString();

  // 4. Create Group B member users (later in time)
  const groupBCount = 3;
  const groupB = await ArrayUtil.asyncRepeat(groupBCount, async () => {
    const member = await createMemberUser();
    // Switch to member and create a todo as well
    await loginMemberUser(member.email, member.password);
    await createTodo();
    return member;
  });

  // Capture a boundary time after Group B creation
  const boundaryAfterGroupB: string = new Date().toISOString();

  // 5. Switch back to admin context before performing admin search
  const adminAgain = await api.functional.auth.adminUser.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.todo-app.test/login",
      referrer: "https://admin.todo-app.test/",
      user_agent: "e2e-test-agent",
    } satisfies ITodoAppAdminUser.ILogin,
  });
  typia.assert(adminAgain);

  // 6. Search with createdFrom after Group A boundary to favor Group B users
  const searchGroupBPage: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 100,
        createdFrom: boundaryAfterGroupA,
      } satisfies ITodoAppMemberuser.IRequest,
    });
  typia.assert(searchGroupBPage);

  const paginationB = searchGroupBPage.pagination;
  const dataB = searchGroupBPage.data;

  // Basic pagination sanity checks for Group B search
  TestValidator.predicate(
    "pagination limit should be at least number of returned records (Group B search)",
    dataB.length <= paginationB.limit,
  );
  TestValidator.predicate(
    "pagination current page should be 1 for Group B search",
    paginationB.current === 1,
  );

  // Ensure summaries have the expected safe shape
  for (const summary of dataB) {
    typia.assert<ITodoAppMemberuser.ISummary>(summary);
  }

  // At least some of Group B members should be included in result set
  const groupBEmails = groupB.map((m) => m.email);
  const dataBEmails = dataB.map((s) => s.email);
  const hasAnyGroupB = groupBEmails.some((email) =>
    dataBEmails.includes(email),
  );
  TestValidator.predicate(
    "search with createdFrom after Group A should include at least one Group B member",
    hasAnyGroupB,
  );

  // 7. Optional inverse test using createdTo between Group A and Group B boundaries
  const t1Millis = new Date(boundaryAfterGroupA).getTime();
  const t2Millis = new Date(boundaryAfterGroupB).getTime();
  const midMillis = Math.floor((t1Millis + t2Millis) / 2);
  const createdToBetweenGroups: string = new Date(midMillis).toISOString();

  const searchGroupABeforeMid: IPageITodoAppMemberuser.ISummary =
    await api.functional.todoApp.adminUser.memberUsers.index(connection, {
      body: {
        page: 1,
        limit: 100,
        createdTo: createdToBetweenGroups,
      } satisfies ITodoAppMemberuser.IRequest,
    });
  typia.assert(searchGroupABeforeMid);

  const paginationA = searchGroupABeforeMid.pagination;
  const dataA = searchGroupABeforeMid.data;

  TestValidator.predicate(
    "pagination limit should be at least number of returned records (Group A search)",
    dataA.length <= paginationA.limit,
  );
  TestValidator.predicate(
    "pagination current page should be 1 for Group A search",
    paginationA.current === 1,
  );

  const groupAEmails = groupA.map((m) => m.email);
  const dataAEmails = dataA.map((s) => s.email);
  const hasAnyGroupA = groupAEmails.some((email) =>
    dataAEmails.includes(email),
  );
  TestValidator.predicate(
    "search with createdTo between groups should include at least one Group A member",
    hasAnyGroupA,
  );

  // 8. Confirm that summary DTO does not expose sensitive fields by checking structure
  for (const summary of dataA) {
    typia.assert<ITodoAppMemberuser.ISummary>(summary);
    const keys = Object.keys(summary as Record<string, unknown>);
    TestValidator.predicate(
      "member summary object must not contain password_hash field",
      !keys.includes("password_hash"),
    );
  }
}
