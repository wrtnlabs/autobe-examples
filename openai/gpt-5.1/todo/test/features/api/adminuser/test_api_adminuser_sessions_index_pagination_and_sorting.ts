import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminuserSession";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppAdminUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUserSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_adminuser_sessions_index_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join) to get a real adminUserId and first session.
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
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  const adminUserId = joinedAdmin.id;

  // 2. Create at least one system setting as admin to simulate realistic system config.
  const systemSettingBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const createdSystemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(createdSystemSetting);

  // 3. Register and login a member user, then create at least one todo to simulate activity.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/join",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const joinedMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const loggedInMember: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(loggedInMember);

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

  // 4. Generate multiple additional sessions for the same admin by logging in repeatedly.
  // Switch back to admin context (login).
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  // Ensure several sessions exist: join already created 1, add 3 more via login.
  const additionalSessionsCount = 3;
  for (let i = 0; i < additionalSessionsCount; i++) {
    const loggedInAdmin: ITodoAppAdminUser.IAuthorized =
      await api.functional.auth.adminUser.login(connection, {
        body: adminLoginBody,
      });
    typia.assert(loggedInAdmin);
  }

  // 5. Call sessions.index with page=1, limit=2, orderByCreatedAt="asc".
  const page1Limit2AscBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "asc",
  } satisfies ITodoAppAdminUserSession.IRequest;

  const page1Asc: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: page1Limit2AscBody,
      },
    );
  typia.assert(page1Asc);

  // Basic structural validations for page 1
  TestValidator.equals(
    "page1 asc: pagination current should be 1",
    page1Asc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 asc: pagination limit should be 2",
    page1Asc.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page1 asc: data length must be <= limit",
    page1Asc.data.length <= page1Asc.pagination.limit,
  );

  // Ensure every session belongs to the adminUserId
  for (const session of page1Asc.data) {
    TestValidator.equals(
      "page1 asc: each session adminUser id matches target",
      session.adminUser.id,
      adminUserId,
    );
  }

  // Validate ascending created_at order within the page.
  for (let i = 1; i < page1Asc.data.length; i++) {
    const prev = page1Asc.data[i - 1];
    const curr = page1Asc.data[i];
    TestValidator.predicate(
      "page1 asc: created_at should be non-decreasing",
      prev.created_at <= curr.created_at,
    );
  }

  // 6. Call sessions.index with page=2, limit=2, orderByCreatedAt="asc".
  const page2Limit2AscBody = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "asc",
  } satisfies ITodoAppAdminUserSession.IRequest;

  const page2Asc: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: page2Limit2AscBody,
      },
    );
  typia.assert(page2Asc);

  TestValidator.equals(
    "page2 asc: pagination current should be 2",
    page2Asc.pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 asc: pagination limit should be 2",
    page2Asc.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page2 asc: data length must be <= limit",
    page2Asc.data.length <= page2Asc.pagination.limit,
  );

  for (const session of page2Asc.data) {
    TestValidator.equals(
      "page2 asc: each session adminUser id matches target",
      session.adminUser.id,
      adminUserId,
    );
  }

  for (let i = 1; i < page2Asc.data.length; i++) {
    const prev = page2Asc.data[i - 1];
    const curr = page2Asc.data[i];
    TestValidator.predicate(
      "page2 asc: created_at should be non-decreasing",
      prev.created_at <= curr.created_at,
    );
  }

  // Validate that there is no overlap of IDs between page 1 and page 2
  const page1Ids = new Set(page1Asc.data.map((s) => s.id));
  for (const session of page2Asc.data) {
    TestValidator.predicate(
      "page2 asc: session IDs should not overlap with page1",
      page1Ids.has(session.id) === false,
    );
  }

  // 7. Optionally, call sessions.index with orderByCreatedAt="desc" page=1, limit=2.
  const page1Limit2DescBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    fromCreatedAt: null,
    toCreatedAt: null,
    ip: null,
    orderByCreatedAt: "desc",
  } satisfies ITodoAppAdminUserSession.IRequest;

  const page1Desc: IPageITodoAppAdminuserSession.ISummary =
    await api.functional.todoApp.adminUser.adminUsers.sessions.index(
      connection,
      {
        adminUserId,
        body: page1Limit2DescBody,
      },
    );
  typia.assert(page1Desc);

  TestValidator.equals(
    "page1 desc: pagination current should be 1",
    page1Desc.pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 desc: pagination limit should be 2",
    page1Desc.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page1 desc: data length must be <= limit",
    page1Desc.data.length <= page1Desc.pagination.limit,
  );

  for (const session of page1Desc.data) {
    TestValidator.equals(
      "page1 desc: each session adminUser id matches target",
      session.adminUser.id,
      adminUserId,
    );
  }

  for (let i = 1; i < page1Desc.data.length; i++) {
    const prev = page1Desc.data[i - 1];
    const curr = page1Desc.data[i];
    TestValidator.predicate(
      "page1 desc: created_at should be non-increasing",
      prev.created_at >= curr.created_at,
    );
  }

  // 8. Cross-check pagination metadata coherence.
  // At least we know total records should be >= number of sessions retrieved so far.
  const totalRecordsAsc = page1Asc.pagination.records;
  TestValidator.predicate(
    "pagination.records should be >= total sessions seen in page1+page2",
    totalRecordsAsc >= page1Asc.data.length + page2Asc.data.length,
  );

  TestValidator.predicate(
    "pagination.pages should be >= 1",
    page1Asc.pagination.pages >= 1,
  );
}
